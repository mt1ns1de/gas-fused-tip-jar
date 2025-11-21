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

/* ========= хелпер для client-only ========= */

function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

/* ========= статы по кошельку ========= */

type JarStats = {
  count: number;
  lastAddress: string | null;
};

function emptyStats(): JarStats {
  return { count: 0, lastAddress: null };
}

/* ========= тип для снапшота газа от CreateJar ========= */

type GasSnapshot = {
  currentGasGwei: number | null;
  capGasGwei: number | null;
};

/* ========= Fuse Tips ========= */

type FuseTipFn = (ctx: { ratio: number | null }) => [string, string];

const FUSE_TIPS: FuseTipFn[] = [
  ({ ratio }) =>
    ratio && ratio < 1
      ? [
          'Your cap is below current gas, so some tips may fail until gas drops.',
          'Bump it slightly if you want tips to go through right now.',
        ]
      : [
          'Medium (≈1.5×) is the sweet spot when gas is low.',
          'Balanced between safety during spikes and not overpaying.',
        ],
  ({ ratio }) =>
    ratio && ratio > 2
      ? [
          'Your fuse cap is very high — tips almost never block, but you may overpay.',
          'Use this only when reliability matters more than gas savings.',
        ]
      : [
          'Low (≈1.1×) is for gas geeks who want to squeeze every wei.',
          'Expect occasional retries when the network gets noisy.',
        ],
  () => [
    'Think of the fuse as a safety ceiling for each supporter.',
    'If gas spikes too hard, their tip reverts instead of silently burning ETH.',
  ],
  () => [
    'Create jars with different caps for different flows: casual tips vs. high-priority drops.',
    'Link the “safe” jar in your bio and keep the “aggressive” one for campaigns.',
  ],
  ({ ratio }) =>
    ratio && ratio >= 1.3 && ratio <= 1.7
      ? [
          'You are in the classic Medium zone — good for most days on Base.',
          'Your supporters stay protected while tips keep flowing.',
        ]
      : [
          'If you are not sure what to pick, Medium (≈1.5×) is the default.',
          'You can always adjust the cap later by creating a new jar.',
        ],
  () => [
    'High (≈2×) is useful when you expect short, intense spikes.',
    'Think NFT mints, launches, or coordinated tip storms.',
  ],
  () => [
    'Fuse cap doesn’t move funds — it only guards how expensive a tip is allowed to be.',
    'If gas goes crazy, the transaction reverts and the supporter keeps their ETH.',
  ],
  () => [
    'Sharing a direct jar link is the fastest way to start receiving tips.',
    'Your supporters don’t need to think about gas math — the fuse is already built in.',
  ],
  () => [
    'Want to experiment? Try one jar with Low, one with Medium, and compare flows.',
    'Different audiences can tolerate different levels of volatility.',
  ],
  () => [
    'When gas on Base is ultra-cheap, even Medium looks generous.',
    'That’s usually the best moment to promote your jar links.',
  ],
  () => [
    'Fuse logic lives inside the jar contract — no external oracles or off-chain magic.',
    'Everything is enforced directly onchain by a simple condition.',
  ],
  () => [
    'If a supporter keeps failing to tip, ask them to try again later — gas might be above your cap.',
    'Or share another jar with a slightly higher fuse just for them.',
  ],
  () => [
    'You can treat jars as “channels”: one per project, event, or persona.',
    'Different fuse settings = different risk profiles for each channel.',
  ],
  () => [
    'Most users never think about gas — Fuse Tip Jar does it for them.',
    'You, as the creator, set the rules once and then just share the link.',
  ],
  () => [
    'If you like calm, predictable flows, stay close to the current gas.',
    'If you like chaos and speed, push the cap higher and ride the spikes.',
  ],
];

export default function Page() {
  const mounted = useMounted();
  const { address } = useAccount();
  const chainId = useChainId();
  const router = useRouter();
  const publicClient = usePublicClient();

  /* ===== Open-a-jar ===== */

  const [openInput, setOpenInput] = useState('');
  const [validating, setValidating] = useState(false);
  const [isValidJar, setIsValidJar] = useState<boolean | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);

  /* ===== Sidebar stats ===== */

  const [stats, setStats] = useState<JarStats>(() => emptyStats());
  const [lastUpdate, setLastUpdate] = useState('just now');

  // для блока "Open a Jar" и fallback для Last created
  const [lastCreatedLocal, setLastCreatedLocal] = useState<string | null>(null);

  /* ===== Fuse gas snapshot от CreateJar ===== */

  const [gasSnapshot, setGasSnapshot] = useState<GasSnapshot>({
    currentGasGwei: null,
    capGasGwei: null,
  });

  /* ===== Fuse Tip rotation state ===== */

  const [tipIndex, setTipIndex] = useState(0);
  const [tipFading, setTipFading] = useState(false);

  /* ===== загрузка lastJarAddress из localStorage для Open-a-jar ===== */

  useEffect(() => {
    if (!mounted) return;
    try {
      const v = window.localStorage.getItem('lastJarAddress');
      if (v) setLastCreatedLocal(v);
    } catch {
      // ignore
    }
  }, [mounted]);

  /* ===== загрузка статов через /api/jars ===== */

  useEffect(() => {
    if (!mounted) return;

    if (!address) {
      setStats(emptyStats());
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/jars?owner=${address}`, { cache: 'no-store' });
        const ctype = res.headers.get('content-type') || '';
        if (!ctype.includes('application/json')) return;

        const data = await res.json();
        if (!res.ok || !data?.ok) return;

        const rows: { jar: string }[] = data.rows || [];
        if (cancelled) return;

        setStats({
          count: rows.length,
          lastAddress: rows[0]?.jar ?? null,
        });
        setLastUpdate('just now');
      } catch (e) {
        console.error('Failed to load jar stats', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mounted, address]);

  /* ===== таймер для lastUpdate (чисто косметика) ===== */

  useEffect(() => {
    setLastUpdate('just now');
    const id = setInterval(() => setLastUpdate('a few seconds ago'), 30_000);
    return () => clearInterval(id);
  }, []);

  /* ===== логика Open-a-jar ===== */

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
    // сохраняем последний созданный для "Open a Jar"
    try {
      window.localStorage.setItem('lastJarAddress', addr);
    } catch {
      // ignore
    }
    setLastCreatedLocal(addr);

    // оптимистично обновляем статы (потом всё равно подтянется из /api)
    setStats((prev) => ({
      count: prev.count + 1,
      lastAddress: addr,
    }));
    setLastUpdate('just now');
  };

  const canOpen = isAddrFormatOk && isValidJar === true && !validating;

  const handleOpen = () => {
    if (!canOpen) return;
    router.push(`/jar/${openInput.trim()}`);
  };

  /* ===== Fuse Tip: ratio + выбор текста + анимация ===== */

  const ratio = useMemo(() => {
    const cur = gasSnapshot.currentGasGwei ?? 0;
    const cap = gasSnapshot.capGasGwei ?? 0;
    if (!cur || !cap || cur <= 0 || cap <= 0) return null;
    return cap / cur;
  }, [gasSnapshot]);

  const fuseTipLines = useMemo<[string, string]>(() => {
    const fn = FUSE_TIPS[tipIndex] ?? FUSE_TIPS[0];
    return fn({ ratio });
  }, [tipIndex, ratio]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTipFading(true);
      setTimeout(() => {
        setTipIndex((prev) => (prev + 1) % FUSE_TIPS.length);
        setTipFading(false);
      }, 400);
    }, 20_000);

    return () => clearInterval(interval);
  }, []);

  /* ===== производные значения ===== */

  const lastCreatedForOpen = lastCreatedLocal || stats.lastAddress;
  const lastCreatedForStats = stats.lastAddress || lastCreatedLocal;

  /* ===== RENDER ===== */

  return (
    <main className="relative z-0 min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <CursorAura />

      {/* ===== CENTRAL COLUMN ===== */}
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
          {mounted && (
            <CreateJar
              onCreated={onJarCreated}
              onGasSnapshotChange={setGasSnapshot}
            />
          )}
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

          {mounted && lastCreatedForOpen && (
            <p className="mt-3 text-center text-xs text-neutral-500">
              Last created:{' '}
              <button
                className="font-mono underline decoration-dotted underline-offset-2 hover:text-neutral-300"
                onClick={() => setOpenInput(lastCreatedForOpen)}
                title="Click to paste last created"
              >
                {lastCreatedForOpen}
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

      {/* ===== RIGHT SIDEBAR ===== */}
      <aside
        className="
          pointer-events-none
          fixed right-6 top-28 z-10 hidden w-[320px] lg:block
        "
      >
        <div className="pointer-events-auto flex flex-col gap-5">
          {/* Your Stats */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-neutral-300 backdrop-blur-sm shadow-[0_0_20px_rgba(255,255,255,0.05)]">
            <h3 className="mb-3 text-center text-base font-semibold text-white">
              Your Stats
            </h3>
            <div className="space-y-2">
              <p>
                Jars you created:{' '}
                <span className="text-white">
                  {stats.count > 0 ? stats.count : '—'}
                </span>
              </p>
              <p>
                Last created:{' '}
                <span className="font-mono text-neutral-200">
                  {lastCreatedForStats
                    ? `${lastCreatedForStats.slice(0, 6)}…${lastCreatedForStats.slice(-4)}`
                    : '—'}
                </span>
              </p>
              <p>
                Last update: <span className="text-neutral-200">{lastUpdate}</span>
              </p>
            </div>
          </section>

          {/* Fuse Tip */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-neutral-300 backdrop-blur-sm shadow-[0_0_20px_rgba(255,255,255,0.05)]">
            <h3 className="mb-3 text-center text-base font-semibold text-white">
              Fuse Tip 💡
            </h3>
            <div
              className={`min-h-[72px] space-y-1 transition-opacity duration-300 ${
                tipFading ? 'opacity-0' : 'opacity-100'
              }`}
            >
              <p>{fuseTipLines[0]}</p>
              <p>{fuseTipLines[1]}</p>
            </div>
          </section>
        </div>
      </aside>
    </main>
  );
}
