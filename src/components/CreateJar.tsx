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

type Props = {
  onCreated?: (address: `0x${string}`) => void;
};

export default function CreateJar({ onCreated }: Props) {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();

  // UI state
  const [inputGwei, setInputGwei] = useState<string>('5'); // только gwei
  const [netGasGwei, setNetGasGwei] = useState<string>('0');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // result
  const [txHash, setTxHash] = useState<Hex | null>(null);
  const [jarAddress, setJarAddress] = useState<`0x${string}` | null>(null);

  // celebration modal
  const [showCelebration, setShowCelebration] = useState(false);

  // ===== helpers =====
  async function ensureBase(): Promise<boolean> {
    try {
      // если уже на Base — ничего не делаем
      if (getChainId(config) === base.id) return true;
    } catch {
      /* ignore */
    }
    try {
      await switchChain(config, { chainId: base.id });
      return true;
    } catch {
      // некоторые кошельки (редко) не дают переключать сеть программно
      return false;
    }
  }

  // fetch current gas (и периодически обновляем)
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const gp = await publicClient?.getGasPrice();
        if (!alive || !gp) return;
        setNetGasGwei(formatGwei(gp));
      } catch {
        /* ignore */
      }
    };
    load();
    const id = setInterval(load, 20000); // раз в 20с
    return () => {
      alive = false;
      clearInterval(id);
    };
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
    const next = (baseFee * mul).toFixed(2);
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
      // 1) гарантируем сеть Base
      const ok = await ensureBase();
      if (!ok) {
        setErr('Please switch your wallet to Base Mainnet (8453) and try again.');
        return;
      }

      // 2) вызов
      const attempt = async () => createJar({ maxGasPriceWei: capWeiBigInt });

      let res = await attempt();

      // 3) если кошелёк внезапно был не на той сети — переключаем и ретраим один раз
      if (!res?.success && res?.error && /does not match the target chain|ChainMismatchError/i.test(res.error)) {
        const switched = await ensureBase();
        if (!switched) {
          setErr('Please switch your wallet to Base Mainnet (8453) and try again.');
          return;
        }
        res = await attempt();
      }

      if (!res?.success) {
        // если юзер отменил — молчим
        if (res?.error && /User rejected/i.test(res.error)) {
          return;
        }
        setErr(res?.error || 'Failed to deploy. Please try again.');
        return;
      }

      if (res.txHash) setTxHash(res.txHash as Hex);
      if (res.jarAddress) {
        setJarAddress(res.jarAddress);
        try {
          localStorage.setItem('lastJarAddress', res.jarAddress);
        } catch {}
        onCreated?.(res.jarAddress as `0x${string}`);
        setShowCelebration(true);
      }
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (/User rejected/i.test(msg)) {
        // игнорируем отмену пользователем
      } else {
        setErr(e?.message ?? 'Unknown error');
      }
    } finally {
      setBusy(false);
    }
  };

  const explorerTx = txHash ? `https://basescan.org/tx/${txHash}` : undefined;
  const explorerAddr = jarAddress ? `https://basescan.org/address/${jarAddress}` : undefined;
  const publicPage = jarAddress ? `/jar/${jarAddress}` : undefined;

  // только цифры/точка в инпуте
  const onGweiChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const v = e.target.value.trim();
    if (!/^(\d+(\.\d{0,6})?|\.\d{0,6})?$/.test(v)) return;
    setInputGwei(v);
  };

  return (
    <div className="space-y-4">
      {/* Input (только Gwei) */}
      <label className="block text-sm font-medium text-center">Max gas price (gwei)</label>
      <input
        value={inputGwei}
        inputMode="decimal"
        onChange={onGweiChange}
        className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 outline-none ring-0 focus:border-[#2563eb]"
        placeholder="e.g. 5"
      />

      {/* Presets */}
      <div className="flex flex-wrap justify-center gap-2">
        <button
          onClick={() => setInputGwei(current ? current.toFixed(2) : '0')}
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
        <span className="tabular-nums">{Number(current).toFixed(2)}</span>{' '}
        gwei. Your cap{' '}
        <span className="tabular-nums">{Number(inputGwei || 0).toFixed(2)} gwei</span>{' '}
        (<span className="tabular-nums">{capWeiBigInt ? `${formatEther(capWeiBigInt)} ETH` : '0'}</span>).
        Transactions will only proceed if the network gas price is ≤ your cap.
      </p>

      {/* Create (по центру) */}
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
          <div className="mb-2 text-center font-semibold">Jar created!</div>
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
          title="Your Jar is live!"
          subtitle="Share your link and start receiving tips on Base."
          link={
            publicPage
              ? (typeof window !== 'undefined' ? `${window.location.origin}${publicPage}` : publicPage)
              : undefined
          }
        />
      )}

      {/* декоративная банка */}
      <div className="pt-2">
        <JarVisual progress={0.65} pulse size={110} />
      </div>
    </div>
  );
}
