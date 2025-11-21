// app/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAccount, useChainId, usePublicClient } from 'wagmi';
import { isAddress } from 'viem';
import WalletButton from '@/components/WalletButton';
import CursorAura from '@/components/CursorAura';
import CreateJar from '@/components/CreateJar';
import { TIPJAR_ABI } from '@/lib/abiTipJar';
import { useRouter } from 'next/navigation';
import Slogan from '@/components/Slogan';
import YourJarsList from '@/components/YourJarsList';

function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

export default function Page() {
  const mounted = useMounted();
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const router = useRouter();
  const publicClient = usePublicClient();

  // Open-a-jar
  const [lastJar, setLastJar] = useState<string | null>(null);
  const [openInput, setOpenInput] = useState('');
  const [validating, setValidating] = useState(false);
  const [isValidJar, setIsValidJar] = useState<boolean | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);

  // Sidebar light info
  const [lastUpdate, setLastUpdate] = useState('just now');
  const [recentJarsCount, setRecentJarsCount] = useState<number | null>(null);

  useEffect(() => {
    if (!mounted) return;
    try {
      const v = localStorage.getItem('lastJarAddress');
      if (v) setLastJar(v);
    } catch {}
  }, [mounted]);

  useEffect(() => {
    setLastUpdate('just now');
    const id = setInterval(() => setLastUpdate('a few seconds ago'), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      const raw = sessionStorage.getItem('your_jars_count');
      if (raw != null) setRecentJarsCount(Number(raw));
    } catch {}
  }, [mounted]);

  const isAddrFormatOk = useMemo(() => isAddress(openInput.trim()), [openInput]);

  useEffect(() => {
    let alive = true;
    const v = openInput.trim();

    if (!v || !isAddrFormatOk) {
      setIsValidJar(null);
      setOpenError(null);
      setValidating(false);
      return;
    }

    const t = setTimeout(async () => {
      if (!publicClient) return;
      setValidating(true);
      setOpenError(null);
      try {
        await publicClient.readContract({
          address: v as `0x${string}`,
          abi: TIPJAR_ABI as any,
          functionName: 'maxGasPriceWei',
          args: [] as const,
        });
        if (!alive) return;
        setIsValidJar(true);
      } catch {
        if (!alive) return;
        setIsValidJar(false);
        setOpenError('This address is not a TipJar contract on Base.');
      } finally {
        if (alive) setValidating(false);
      }
    }, 250);

    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [openInput, publicClient, isAddrFormatOk]);

  const onJarCreated = (addr: string) => {
    try {
      localStorage.setItem('lastJarAddress', addr);
    } catch {}
    setLastJar(addr);
    setLastUpdate('just now');
  };

  const canOpen = isAddrFormatOk && isValidJar === true && !validating;

  const handleOpen = () => {
    if (!canOpen) return;
    router.push(`/jar/${openInput.trim()}`);
  };

  return (
    <main className="relative z-0 min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <CursorAura />

      {/* ===== CENTRAL COLUMN (всегда по центру) ===== */}
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-8 flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold">Gas-Fused Tip Jar</h1>
            {mounted && (
              <p className="text-sm text-neutral-400">
                Network: {chainId ?? '—'} (Base Mainnet)
                <br />
                Factory{' '}
                <a
                  className="text-[#7ab4ff] underline"
                  href={`https://basescan.org/address/${process.env.NEXT_PUBLIC_FACTORY_BASE_MAINNET}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {process.env.NEXT_PUBLIC_FACTORY_BASE_MAINNET}
                </a>
              </p>
            )}
          </div>
          <WalletButton />
        </header>

        {/* Create Jar */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
          <h2 className="mb-4 text-center text-xl font-semibold">Create Jar</h2>
          {mounted && <CreateJar onCreated={onJarCreated} />}
        </section>

        {/* Open a Jar */}
        <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
          <h3 className="mb-3 text-center text-lg font-semibold">Open a Jar</h3>

          <input
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 outline-none ring-0 focus:border-[#2563eb]"
            placeholder="Paste jar address 0x…"
            value={openInput}
            onChange={(e) => setOpenInput(e.target.value)}
          />

          <div className="mt-2 min-h-[1.5rem] text-center text-sm">
            {!openInput ? (
              <p className="text-neutral-400">
                Enter a specific jar address to open its public page (direct access).
              </p>
            ) : !isAddrFormatOk ? (
              <p className="text-red-300">Invalid address format.</p>
            ) : validating ? (
              <p className="text-neutral-400">Validating address on-chain…</p>
            ) : isValidJar === false ? (
              <p className="text-red-300">{openError}</p>
            ) : isValidJar === true ? (
              <p className="text-emerald-300">Looks good — this is a TipJar. You can open it.</p>
            ) : null}
          </div>

          <div className="mt-3 flex justify-center">
            <button
              onClick={handleOpen}
              disabled={!canOpen}
              className="rounded-xl bg-[#0052FF] px-5 py-2.5 font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50 hover:opacity-90 active:opacity-80"
            >
              {validating ? 'Validating…' : 'Open'}
            </button>
          </div>

          {mounted && lastJar && (
            <p className="mt-3 text-center text-xs text-neutral-500">
              Last created:{' '}
              <button
                className="font-mono underline decoration-dotted underline-offset-2 hover:text-neutral-300"
                onClick={() => setOpenInput(lastJar)}
                title="Click to paste last created"
              >
                {lastJar}
              </button>
            </p>
          )}
        </section>

        {/* Your Jars */}
        <section className="mt-6">
          <YourJarsList />
        </section>

        <div className="mt-8">
          <Slogan />
        </div>
      </div>

      {/* ===== RIGHT OVERLAY SIDEBAR (не влияет на центр, просто висит справа) ===== */}
      <aside
        className="
          pointer-events-none      /* контейнер не ловит события… */
          fixed right-6 top-28 z-10 hidden w-[320px] lg:block
        "
      >
        <div className="pointer-events-auto flex flex-col gap-5">
          {/* Your Stats */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-neutral-300 backdrop-blur-sm shadow-[0_0_20px_rgba(255,255,255,0.05)]">
            <h3 className="mb-3 text-center text-base font-semibold text-white">Your Stats</h3>
            <div className="space-y-2">
              <p>
                Jars you created:{' '}
                <span className="text-white">
                  {recentJarsCount == null ? '—' : recentJarsCount}
                </span>
              </p>
              <p>
                Last created:{' '}
                <span className="font-mono text-neutral-200">
                  {lastJar ? `${lastJar.slice(0, 6)}…${lastJar.slice(-4)}` : '—'}
                </span>
              </p>
              <p>
                Last update: <span className="text-neutral-200">{lastUpdate}</span>
              </p>
            </div>
          </section>

          {/* Fuse Tip */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-neutral-300 backdrop-blur-sm shadow-[0_0_20px_rgba(255,255,255,0.05)]">
            <h3 className="mb-3 text-center text-base font-semibold text-white">Fuse Tip 💡</h3>
            <div className="min-h-[72px] space-y-1">
              <p>Medium (1.5×) cap is the sweet spot when gas is low.</p>
              <p>For smoother flows during spikes — try High (2.0×).</p>
            </div>
          </section>
        </div>
      </aside>
    </main>
  );
}
