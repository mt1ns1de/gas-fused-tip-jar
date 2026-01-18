'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { type Hex, formatGwei, parseGwei } from 'viem';
import { base } from 'viem/chains';
import { switchChain, getChainId } from 'wagmi/actions';
import { config } from '@/lib/wagmi';

import { createJar } from '@/actions/createJar.client';
import ShareModal from '@/components/ShareModal';
import JarVisual from '@/components/JarVisual';
import { getSafeGasPrice } from '@/lib/gas';
import GasProfileMeter from '@/components/GasProfileMeter';
import MascotBadge from '@/components/MascotBadge';

type GasSnapshot = {
  currentGasGwei: number | null;
  capGasGwei: number | null;
};

type Props = {
  onCreated?: (address: `0x${string}`) => void;
  onGasSnapshotChange?: (snapshot: GasSnapshot) => void;
};

export default function CreateJar({ onCreated, onGasSnapshotChange }: Props) {
  const { isConnected } = useAccount();
  const publicClient = usePublicClient();

  // UI state
  const [inputGwei, setInputGwei] = useState<string>(''); // will be filled after first fetch (Medium)
  const [netGasGwei, setNetGasGwei] = useState<string>('0');
  const [usingFallback, setUsingFallback] = useState<boolean>(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // left floating help panel
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
    } catch {
      // ignore getChainId error, will try switching
    }
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
        const rounded = Number.isFinite(gwei) ? gwei : 0;

        setNetGasGwei(rounded.toFixed(3));
        setUsingFallback(fallbackUsed);

        // auto Medium (1.5×) only once
        setInputGwei((prev) =>
          prev === '' ? (rounded * 1.5).toFixed(3) : prev,
        );
      } catch {
        // silently ignore — keep previous state
      }
    };

    void load();
    const id = setInterval(load, 20000);

    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [publicClient]);

  const current = useMemo(
    () => Number(netGasGwei || '0'),
    [netGasGwei],
  );

  const capWeiBigInt = useMemo(() => {
    try {
      const numeric = Number(inputGwei || '0');
      if (!Number.isFinite(numeric) || numeric <= 0) return 0n;
      return parseGwei(String(numeric));
    } catch {
      return 0n;
    }
  }, [inputGwei]);

  // sample values used for the Example panel
  const exampleGas =
    current && Number.isFinite(current) && current > 0 ? current : null;
  const exampleMediumCap = exampleGas !== null ? exampleGas * 1.5 : null;

  // expose gas snapshot to parent so it can compute ratios
  useEffect(() => {
    if (!onGasSnapshotChange) return;

    const cur =
      current && Number.isFinite(current) && current > 0 ? current : null;
    const capVal =
      inputGwei && Number(inputGwei) > 0 ? Number(inputGwei) : null;

    onGasSnapshotChange({
      currentGasGwei: cur,
      capGasGwei: capVal,
    });
  }, [current, inputGwei, onGasSnapshotChange]);

  const multiplierClick = (mul: number) => {
    const baseFee = current || 0;
    if (!Number.isFinite(baseFee) || baseFee <= 0) return;
    const next = (baseFee * mul).toFixed(3);
    setInputGwei(next);
  };

  const disabled =
    !isConnected || !capWeiBigInt || capWeiBigInt <= 0n || busy;

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

      if (
        !res?.success &&
        res?.error &&
        /does not match the target chain|ChainMismatchError/i.test(res.error)
      ) {
        const switched = await ensureBase();
        if (!switched) {
          setErr('Please switch your wallet to Base Mainnet (8453) and try again.');
          return;
        }
        res = await attempt();
      }

      if (!res?.success) {
        if (res?.error && /User rejected/i.test(res.error)) return;
        setErr(res?.error || 'Failed to deploy. Please try again.');
        return;
      }

      if (res.txHash) setTxHash(res.txHash as Hex);

      if (res.jarAddress) {
        const addr = res.jarAddress as `0x${string}`;
        setJarAddress(addr);

        try {
          localStorage.setItem('lastJarAddress', addr);
        } catch {
          // ignore localStorage error
        }

        onCreated?.(addr);
        setShowCelebration(true);
      }
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (/User rejected/i.test(msg)) {
        // user closed / rejected wallet, do not show error
      } else {
        setErr(e?.message ?? 'Unknown error');
      }
    } finally {
      setBusy(false);
    }
  };

  const explorerTx = txHash ? `https://basescan.org/tx/${txHash}` : undefined;
  const explorerAddr = jarAddress
    ? `https://basescan.org/address/${jarAddress}`
    : undefined;
  const publicPage = jarAddress ? `/jar/${jarAddress}` : undefined;

  const onGweiChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const v = e.target.value.trim();
    // allow only decimal with up to 6 decimals
    if (!/^(\d+(\.\d{0,6})?|\.\d{0,6})?$/.test(v)) return;
    setInputGwei(v);
  };

  /** ===== RENDER ===== */
  return (
    // wrapper for absolute left panel and mascot
    <div className="relative">
      {/* Mascot in the top-left corner of the Create Jar card */}
      <div className="absolute left-0 -top-10">
        <MascotBadge />
      </div>

      {/* LEFT FLOATING PANEL — compact Example with live numbers */}
      <div className="pointer-events-auto absolute -left-[320px] top-2 hidden w-[280px] lg:block">
        <button
          type="button"
          aria-expanded={showHow}
          onClick={() => setShowHow((s) => !s)}
          className="w-full select-none rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-neutral-200 shadow-sm transition hover:bg-white/10"
        >
          <span className="inline-flex items-center gap-1">
            Example
            <span
              className={`transition-transform ${showHow ? 'rotate-180' : ''}`}
            >
              ▾
            </span>
          </span>
        </button>

        {/* Smooth collapse/expand */}
        <div
          className={[
            'overflow-hidden',
            'transition-[max-height,opacity]',
            'duration-300 ease-out',
            showHow ? 'max-h-[560px] opacity-100' : 'max-h-0 opacity-0',
          ].join(' ')}
        >
          <div className="pt-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-neutral-300 backdrop-blur-sm">
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  {exampleGas !== null ? (
                    <>
                      Gas is{' '}
                      <span className="font-mono">
                        {exampleGas.toFixed(3)}
                      </span>{' '}
                      gwei now.
                    </>
                  ) : (
                    'Gas is loading…'
                  )}
                </li>
                <li>You choose Medium (1.5×).</li>
                <li>
                  {exampleMediumCap !== null ? (
                    <>
                      Cap becomes ≈{' '}
                      <span className="font-mono">
                        {exampleMediumCap.toFixed(3)}
                      </span>{' '}
                      gwei.
                    </>
                  ) : (
                    'Cap becomes ≈1.5× current gas.'
                  )}
                </li>
                <li>Tips revert if gas goes higher.</li>
              </ul>

              {usingFallback && (
                <p className="mt-2 text-xs text-neutral-400">
                  Gas price uses a fallback source right now.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CARD */}
      <div className="relative space-y-4">
        {/* Input (Gwei) */}
        <label className="block text-center text-sm font-medium">
          Max gas price (gwei)
        </label>
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
            onClick={() =>
              setInputGwei(
                current && current > 0 ? current.toFixed(3) : '0',
              )
            }
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

        {/* Gas profile with live numbers */}
        <GasProfileMeter
          currentGwei={current && current > 0 ? current : null}
          capGwei={
            inputGwei && Number(inputGwei) > 0 ? Number(inputGwei) : null
          }
        />

        {/* Create button */}
        <div className="flex justify-center">
          <button
            onClick={onCreate}
            disabled={disabled}
            aria-busy={busy}
            className="rounded-xl bg-[#0052FF] px-5 py-2.5 font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50 hover:opacity-90 active:opacity-80"
          >
            {busy
              ? 'Creating…'
              : isConnected
              ? 'Create Jar'
              : 'Connect a wallet first'}
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
            <div className="mb-2 text-center font-semibold">
              Jar created! 💙
            </div>
            <div className="text-sm">
              <div className="mb-1 text-center">
                <span className="text-neutral-400">Address: </span>
                <span
                  title={jarAddress}
                  className="inline-block max-w-[60ch] truncate align-bottom"
                >
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
                ? typeof window !== 'undefined'
                  ? `${window.location.origin}${publicPage}`
                  : publicPage
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
