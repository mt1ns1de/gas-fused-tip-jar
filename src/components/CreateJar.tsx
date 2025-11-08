'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAccount, useChainId, usePublicClient } from 'wagmi';
import { type Hex, formatGwei, formatEther, parseGwei } from 'viem';
import { base } from 'viem/chains';
import { switchChain, getChainId } from 'wagmi/actions';
import { config } from '@/lib/wagmi';

import { createJar } from '@/actions/createJar.client';
import ShareModal from '@/components/ShareModal';
import JarVisual from '@/components/JarVisual';
import { getSafeGasPrice } from '@/lib/gas';

type Props = {
  onCreated?: (address: `0x${string}`) => void;
};

export default function CreateJar({ onCreated }: Props) {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();

  // UI state
  const [inputGwei, setInputGwei] = useState<string>(''); // авто выставим Medium при первом фетче
  const [netGasGwei, setNetGasGwei] = useState<string>('0');
  const [usingFallback, setUsingFallback] = useState<boolean>(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // left floating help
  const [showHow, setShowHow] = useState(false);

  // result
  const [txHash, setTxHash] = useState<Hex | null>(null);
  const [jarAddress, setJarAddress] = useState<`0x${string}` | null>(null);

  // celebration modal
  const [showCelebration, setShowCelebration] = useState(false);

  /** ===== helpers ===== */
  async function ensureBase(): Promise<boolean> {
    try {
      if (getChainId(config) === base.id) return true;
    } catch { /* ignore */ }
    try {
      await switchChain(config, { chainId: base.id });
      return true;
    } catch {
      return false;
    }
  }

  /** ===== gas price + medium preset ===== */
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        if (!publicClient) return;
        const { wei, fallbackUsed } = await getSafeGasPrice(publicClient);
        if (!alive) return;
        const gwei = Number(formatGwei(wei));
        setNetGasGwei(gwei.toFixed(3));
        setUsingFallback(fallbackUsed);
        // auto Medium (1.5×) только один раз
        setInputGwei((prev) => (prev === '' ? (gwei * 1.5).toFixed(3) : prev));
      } catch { /* ignore */ }
    };
    void load();
    const id = setInterval(load, 20000);
    return () => { alive = false; clearInterval(id); };
  }, [publicClient]);

  const current = useMemo(() => Number(netGasGwei || '0'), [netGasGwei]);

  const capWeiBigInt = useMemo(() => {
    try {
      return parseGwei(`${Number(inputGwei || '0')}`);
    } catch {
      return 0n;
    }
  }, [inputGwei]);

  const multiplierClick = (mul: number) => {
    const baseFee = current || 0;
    const next = (baseFee * mul).toFixed(3);
    setInputGwei(next);
  };

  const disabled = !isConnected || !capWeiBigInt || capWeiBigInt <= 0n || busy;

  const onCreate = async () => {
    if (disabled) return;
    setBusy(true);
    setErr(null);
    setTxHash(null);
    setJarAddress(null);

    try {
      const ok = await ensureBase();
      if (!ok) {
        setErr('Please switch your wallet to Base Mainnet (8453) and try again.');
        return;
      }

      const attempt = async () => createJar({ maxGasPriceWei: capWeiBigInt });
      let res = await attempt();

      if (!res?.success && res?.error && /does not match the target chain|ChainMismatchError/i.test(res.error)) {
        const switched = await ensureBase();
        if (!switched) {
          setErr('Please switch your wallet to Base Mainnet (8453) and try again.');
          return;
        }
        res = await attempt();
      }

      if (!res?.success) {
        if (res?.error && /User rejected/i.test(res?.error)) return;
        setErr(res?.error || 'Failed to deploy. Please try again.');
        return;
      }

      if (res.txHash) setTxHash(res.txHash as Hex);
      if (res.jarAddress) {
        setJarAddress(res.jarAddress);
        try { localStorage.setItem('lastJarAddress', res.jarAddress); } catch {}
        onCreated?.(res.jarAddress as `0x${string}`);
        setShowCelebration(true);
      }
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (/User rejected/i.test(msg)) { /* ignore */ }
      else setErr(e?.message ?? 'Unknown error');
    } finally {
      setBusy(false);
    }
  };

  const explorerTx = txHash ? `https://basescan.org/tx/${txHash}` : undefined;
  const explorerAddr = jarAddress ? `https://basescan.org/address/${jarAddress}` : undefined;
  const publicPage = jarAddress ? `/jar/${jarAddress}` : undefined;

  const onGweiChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const v = e.target.value.trim();
    if (!/^(\d+(\.\d{0,6})?|\.\d{0,6})?$/.test(v)) return;
    setInputGwei(v);
  };

  /** ===== RENDER ===== */
  return (
    // оборачиваем центральную колонку, чтобы якорить левую панель
    <div className="relative">
      {/* LEFT FLOATING PANEL — shows in empty space on large screens */}
      <div className="pointer-events-auto absolute -left-[320px] top-2 hidden w-[280px] lg:block">
        <button
          type="button"
          onClick={() => setShowHow((s) => !s)}
          className="w-full select-none rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-neutral-200 shadow-sm transition hover:bg-white/10"
        >
          <span className="inline-flex items-center gap-1">
            How it works
            <span className={`transition-transform ${showHow ? 'rotate-180' : ''}`}>▾</span>
          </span>
        </button>

        <div
          className={`overflow-hidden transition-all duration-300 ${
            showHow ? 'max-h-[560px] opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-1'
          }`}
        >
          <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-neutral-300 backdrop-blur-sm">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <span className="font-medium">Cap</span> is the max gas price this jar accepts.
              </li>
              <li>
                If network gas is higher than the cap, a tip reverts with <span className="italic">Gas price too high</span>.
              </li>
              <li>
                Presets: Auto uses current gas, Low 1.1×, Medium 1.5×, High 2.0×.
              </li>
              <li>
                For smoother tips pick Medium or High when gas is very low now.
              </li>
              <li className="text-neutral-400">
                {usingFallback ? 'Using fallback for gas price.' : 'Live gas price loaded.'}
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* MAIN CARD — unchanged layout */}
      <div className="space-y-4">
        <h2 className="text-center text-2xl font-semibold">Create Jar</h2>

        {/* Input (Gwei) */}
        <label className="block text-center text-sm font-medium">Max gas price (gwei)</label>
        <input
          value={inputGwei}
          inputMode="decimal"
          step="0.001"
          onChange={onGweiChange}
          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 outline-none ring-0 focus:border-[#2563eb]"
          placeholder="auto medium preset"
        />

        {/* Presets */}
        <div className="flex flex-wrap justify-center gap-2">
          <button
            onClick={() => setInputGwei(current ? current.toFixed(3) : '0')}
            className="rounded-md bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15"
          >
            Auto (recommended)
          </button>
          <button
            onClick={() => multiplierClick(1.1)}
            className="rounded-md bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15"
          >
            Low (1.1×)
          </button>
          <button
            onClick={() => multiplierClick(1.5)}
            className="rounded-md bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15"
          >
            Medium (1.5×)
          </button>
          <button
            onClick={() => multiplierClick(2.0)}
            className="rounded-md bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15"
          >
            High (2.0×)
          </button>
        </div>

        {/* Hint */}
        <p className="text-center text-sm text-neutral-400">
          Current base fee{' '}
          <span className="tabular-nums">{Number(current).toFixed(3)}</span>{' '}
          gwei{usingFallback && <span className="ml-1 text-neutral-300">(using fallback)</span>}.{' '}
          Your cap{' '}
          <span className="tabular-nums">{Number(inputGwei || 0).toFixed(3)} gwei</span>{' '}
          (<span className="tabular-nums">{capWeiBigInt ? `${formatEther(capWeiBigInt)} ETH` : '0'}</span>).
          Transactions will only proceed if the network gas price is ≤ your cap.
        </p>

        {/* Create */}
        <div className="flex justify-center">
          <button
            onClick={onCreate}
            disabled={disabled}
            aria-busy={busy}
            className="rounded-xl bg-[#0052FF] px-5 py-2.5 font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50 hover:opacity-90 active:opacity-80"
          >
            {busy ? 'Creating…' : isConnected ? 'Create Jar' : 'Connect a wallet first'}
          </button>
        </div>

        {/* Error */}
        {err && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {err}
          </div>
        )}

        {/* Result */}
        {jarAddress && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="mb-2 text-center font-semibold">Jar created! 💙</div>
            <div className="text-sm">
              <div className="mb-1 text-center">
                <span className="text-neutral-400">Address: </span>
                <span title={jarAddress} className="inline-block max-w-[60ch] truncate align-bottom">
                  {jarAddress}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {txHash && (
                  <a
                    className="rounded-md bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15"
                    href={explorerTx}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View tx
                  </a>
                )}
                {explorerAddr && (
                  <a
                    className="rounded-md bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15"
                    href={explorerAddr}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open in Basescan
                  </a>
                )}
                {publicPage && (
                  <a
                    className="rounded-md bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15"
                    href={publicPage}
                  >
                    Open public page
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Celebration / Share modal */}
        {showCelebration && (
          <ShareModal
            open={showCelebration}
            onClose={() => setShowCelebration(false)}
            title="Your Jar is live! 💙"
            subtitle="Share your link and start receiving tips on Base."
            link={
              publicPage
                ? (typeof window !== 'undefined' ? `${window.location.origin}${publicPage}` : publicPage)
                : undefined
            }
          />
        )}

        {/* Decorative jar */}
        <div className="pt-2">
          <JarVisual progress={0.65} pulse size={110} />
        </div>
      </div>
    </div>
  );
}
