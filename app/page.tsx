'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAccount, useChainId, usePublicClient } from 'wagmi';
import { isAddress } from 'viem';
import { AnimatePresence, motion } from 'framer-motion';

import WalletButton from '@/components/WalletButton';
import CursorAura from '@/components/CursorAura';
import CreateJar from '@/components/CreateJar';
import { TIPJAR_ABI } from '@/lib/abiTipJar';
import { useRouter } from 'next/navigation';
import Slogan from '@/components/Slogan';
import YourJarsList from '@/components/YourJarsList';
import FuseTour from '@/components/FuseTour';
import { normalizeJars, type JarRow } from '@/lib/normalizeJars';

/* ========= Client-only helper ========= */

function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

/* ========= Local stats by wallet (for lastAddress) ========= */

type StoredJar = {
  address: string;
  createdAt: string; // ISO
};

type JarStats = {
  count: number;
  lastAddress: string | null;
  lastCreatedAt: string | null;
};

const JAR_KEY_PREFIX = 'gf-tipjar:jars:';

function emptyStats(): JarStats {
  return { count: 0, lastAddress: null, lastCreatedAt: null };
}

function getJarKey(wallet?: string | null) {
  return `${JAR_KEY_PREFIX}${wallet ? wallet.toLowerCase() : 'anon'}`;
}

function readJarStats(wallet?: string | null): JarStats {
  if (typeof window === 'undefined') return emptyStats();

  const key = getJarKey(wallet);
  const raw = window.localStorage.getItem(key);
  if (!raw) return emptyStats();

  try {
    const list: StoredJar[] = JSON.parse(raw);
    if (!Array.isArray(list) || list.length === 0) return emptyStats();

    const first = list[0];
    return {
      count: list.length,
      lastAddress: first?.address ?? null,
      lastCreatedAt: first?.createdAt ?? null,
    };
  } catch {
    return emptyStats();
  }
}

function recordJarForWallet(wallet: string | null | undefined, jarAddress: string) {
  if (typeof window === 'undefined') return;

  const key = getJarKey(wallet);
  let list: StoredJar[] = [];

  const raw = window.localStorage.getItem(key);
  if (raw) {
    try {
      list = JSON.parse(raw);
    } catch {
      list = [];
    }
  }

  const entry: StoredJar = {
    address: jarAddress,
    createdAt: new Date().toISOString(),
  };

  // New jar to top, remove duplicates, limit list
  list = [entry, ...list.filter((j) => j.address.toLowerCase() !== jarAddress.toLowerCase())];
  list = list.slice(0, 50);

  window.localStorage.setItem(key, JSON.stringify(list));
  window.localStorage.setItem('lastJarAddress', jarAddress);
}

/* ========= Gas snapshot type from CreateJar ========= */

type GasSnapshot = {
  currentGasGwei: number | null;
  capGasGwei: number | null;
};

/* ========= JarCreated event description ========= */

const JAR_CREATED_EVENT = {
  type: 'event',
  name: 'JarCreated',
  inputs: [
    { indexed: true, name: 'owner', type: 'address' },
    { indexed: false, name: 'jar', type: 'address' },
  ],
} as const;

/* ========= Fuse Tips ========= */

type FuseTipFn = (ctx: { ratio: number | null }) => [string, string];

const FUSE_TIPS: FuseTipFn[] = [
  ({ ratio }) =>
    ratio && ratio < 1
      ? [
          'Your cap is below current gas, so some tips may fail until gas drops.',
          'Raise it a little if you want tips to go through right now.',
        ]
      : [
          'Medium (≈1.5×) keeps a simple buffer above current gas.',
          'Most days that is enough for tips to land without wasting much on fees.',
        ],
  ({ ratio }) =>
    ratio && ratio > 2
      ? [
          'Your fuse cap is quite high. Tips almost never block, but gas can get expensive.',
          'Use this when you care more about reliability than squeezing every wei.',
        ]
      : [
          'Low (≈1.1×) stays close to current gas.',
          'Expect the occasional revert when the network moves more than usual.',
        ],
  () => [
    'The fuse is a safety ceiling on gas for each tip.',
    'If gas goes past it, the transaction reverts and the supporter keeps their ETH.',
  ],
  () => [
    'You can create more than one jar if you like.',
    'Keep one for casual tips and another with a higher cap for busy moments.',
  ],
  ({ ratio }) =>
    ratio && ratio >= 1.3 && ratio <= 1.7
      ? [
          'Your cap sits in the Medium range.',
          'It leaves room for small spikes while still protecting supporters.',
        ]
      : [
          'If you are not sure what to pick, Medium (≈1.5×) is a safe default.',
          'You can always create a new jar later with a different cap.',
        ],
  () => [
    'High (≈2×) is for short windows where you expect gas to move fast.',
    'Useful for mints, launches, or short campaigns where failed tips are more annoying than extra gas.',
  ],
  () => [
    'The fuse cap never moves funds. It only limits how expensive a tip is allowed to be.',
    'If gas goes wild, the transaction just reverts and the supporter keeps their ETH.',
  ],
  () => [
    'When you share a jar link, people can just tip.',
    'You already baked your gas rules into that link.',
  ],
  () => [
    'Want to experiment? Try one jar with Low and one with Medium.',
    'Different projects can live with different gas risk.',
  ],
  () => [
    'When gas on Base is very cheap, even Medium feels generous.',
    'That is usually a good moment to share jar links.',
  ],
  () => [
    'Fuse logic lives inside the jar contract.',
    'It is just a simple onchain condition that checks gas price before a tip goes through.',
  ],
  () => [
    'If someone keeps failing to tip, gas might be above your cap.',
    'You can share another jar with a slightly higher fuse just for them.',
  ],
  () => [
    'You can treat jars as channels: one per project, event, or persona.',
    'Different fuse settings give each channel its own risk profile.',
  ],
  () => [
    'Most people never look at gas numbers.',
    'Here you set a cap once and then reuse the same jar link.',
  ],
  () => [
    'If you want predictable costs, stay close to the current gas price.',
    'If you are okay paying more sometimes, raise the cap and give tips more room to land.',
  ],
];

export default function Page() {
  const mounted = useMounted();
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const router = useRouter();
  const publicClient = usePublicClient();

  /* ===== Open-a-jar Logic ===== */

  const [openInput, setOpenInput] = useState('');
  const [validating, setValidating] = useState(false);
  const [isValidJar, setIsValidJar] = useState<boolean | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);

  /* ===== Sidebar stats (local lastAddress) ===== */

  const [stats, setStats] = useState<JarStats>(() => emptyStats());
  const [lastUpdate, setLastUpdate] = useState('just now');

  /* ===== Fuse gas snapshot from CreateJar ===== */

  const [gasSnapshot, setGasSnapshot] = useState<GasSnapshot>({
    currentGasGwei: null,
    capGasGwei: null,
  });

  /* ===== Fuse Tip rotation state ===== */

  const [tipIndex, setTipIndex] = useState(0);

  /* ===== Jars from API for correct counter ===== */

  const [jarRows, setJarRows] = useState<JarRow[]>([]);

  useEffect(() => {
    if (!mounted) return;
    if (!address) {
      setJarRows([]);
      return;
    }

    (async () => {
      try {
        const r = await fetch(`/api/jars?owner=${address}`, { cache: 'no-store' });
        const ctype = r.headers.get('content-type') || '';
        if (!ctype.includes('application/json')) {
          const text = await r.text();
          console.error('Unexpected /api/jars response for stats', text.slice(0, 200));
          setJarRows([]);
          return;
        }
        const j = await r.json();
        if (!r.ok || !j?.ok) {
          console.error('Failed to load jars for stats', j?.error);
          setJarRows([]);
          return;
        }
        setJarRows(j.rows || []);
      } catch (e) {
        console.error('Failed to load jars for stats', e);
        setJarRows([]);
      }
    })();
  }, [mounted, address]);

  const normalizedJars = useMemo(() => normalizeJars(jarRows), [jarRows]);

  /* ===== Load local stats on mount/wallet change ===== */

  useEffect(() => {
    if (!mounted) return;
    setStats(readJarStats(address));
  }, [mounted, address]);

  /* ===== Timer for lastUpdate ===== */

  useEffect(() => {
    setLastUpdate('just now');
    const id = setInterval(() => setLastUpdate('a few seconds ago'), 30_000);
    return () => clearInterval(id);
  }, []);

  /* ===== Backfill old jars from Factory (for local lastAddress) ===== */

  useEffect(() => {
    if (!mounted) return;
    if (!address) return;
    if (!publicClient) return;
    if (stats.count > 0) return; // Already have local stats

    const factory = process.env.NEXT_PUBLIC_FACTORY_BASE_MAINNET as `0x${string}` | undefined;
    if (!factory) return;

    let cancelled = false;

    (async () => {
      try {
        const logs = await publicClient.getLogs({
          address: factory,
          event: JAR_CREATED_EVENT,
          args: { owner: address as `0x${string}` },
          fromBlock: 0n,
          toBlock: 'latest',
        });

        if (cancelled || !logs.length) return;

        const seen: Set<string> = new Set();
        const jars: string[] = [];

        for (const log of logs.reverse()) {
          const jar = (log as any).args?.jar as string | undefined;
          if (!jar) continue;
          const key = jar.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          jars.unshift(jar);
        }

        if (!jars.length) return;

        jars.forEach((jar) => recordJarForWallet(address, jar));
        if (!cancelled) {
          setStats(readJarStats(address));
          setLastUpdate('just now');
        }
      } catch (e) {
        console.error('Failed to backfill jar stats', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mounted, address, publicClient, stats.count]);

  /* ===== Open-a-jar Logic ===== */

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
    recordJarForWallet(address, addr);
    setStats(readJarStats(address));
    setLastUpdate('just now');
    // Update jar list in stats from API
    if (address) {
      (async () => {
        try {
          const r = await fetch(`/api/jars?owner=${address}`, { cache: 'no-store' });
          const j = await r.json();
          if (r.ok && j?.ok) setJarRows(j.rows || []);
        } catch {
          // Silently ignore
        }
      })();
    }
  };

  const canOpen = isAddrFormatOk && isValidJar === true && !validating;

  const handleOpen = () => {
    if (!canOpen) return;
    router.push(`/jar/${openInput.trim()}`);
  };

  /* ===== Fuse Tip: ratio + text selection + animation ===== */

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
    const interval = setInterval(
      () => setTipIndex((prev) => (prev + 1) % FUSE_TIPS.length),
      20_000,
    );
    return () => clearInterval(interval);
  }, []);

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
        <section className="relative rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
          <h2 className="mb-4 text-center text-xl font-semibold">Create Jar</h2>
          {mounted && (
            <>
              <FuseTour />
              <CreateJar
                onCreated={onJarCreated}
                onGasSnapshotChange={setGasSnapshot}
              />
            </>
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
                Paste a jar address to open its public page.
              </p>
            ) : !isAddrFormatOk ? (
              <p className="text-red-300">Invalid address format.</p>
            ) : validating ? (
              <p className="text-neutral-400">Validating address on-chain…</p>
            ) : isValidJar === false ? (
              <p className="text-red-300">{openError}</p>
            ) : isValidJar === true ? (
              <p className="text-emerald-300">Looks good. This is a TipJar on Base.</p>
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

          {mounted && stats.lastAddress && (
            <p className="mt-3 text-center text-xs text-neutral-500">
              Last created:{' '}
              <button
                className="font-mono underline decoration-dotted underline-offset-2 hover:text-neutral-300"
                onClick={() => setOpenInput(stats.lastAddress ?? '')}
                title="Click to paste last created"
              >
                {stats.lastAddress}
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
          fixed left-1/2 top-28 z-10 hidden w-[320px] -translate-y-0 ml-[26rem] xl:block
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
                  {normalizedJars.length > 0 ? normalizedJars.length : '—'}
                </span>
              </p>
              <p>
                Last created:{' '}
                <span className="font-mono text-neutral-200">
                  {normalizedJars[0]
                    ? `${normalizedJars[0].jar.slice(0, 6)}…${normalizedJars[0].jar.slice(-4)}`
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
            <div className="min-h-[72px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={tipIndex}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="space-y-1"
                >
                  <p>{fuseTipLines[0]}</p>
                  <p>{fuseTipLines[1]}</p>
                </motion.div>
              </AnimatePresence>
            </div>
          </section>
        </div>
      </aside>
    </main>
  );
}