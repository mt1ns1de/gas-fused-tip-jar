'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAccount, usePublicClient } from 'wagmi';
import CursorAura from '@/components/CursorAura';
import WalletButton from '@/components/WalletButton';
import { decodeEventLog, formatEther, Hex, parseEther } from 'viem';
import { TIPJAR_ABI } from '@/lib/abiTipJar';
import { getPrimaryName } from '@/lib/identity';
import Avatar from '@/components/Avatar';
import Slogan from '@/components/Slogan'; // ваш компонент со слоганами (fade-in)

/** ===== Utils ===== */

// простая защита от HTML
function sanitizeMessage(s: unknown, max = 240): string {
  if (!s || typeof s !== 'string') return '';
  const stripped = s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  if (stripped.length <= max) return stripped;
  return stripped.slice(0, max - 1) + '…';
}

type TipItem = {
  txHash: Hex;
  from: `0x${string}`;
  amountWei: bigint;
  message: string;
  blockNumber: bigint;
};

function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

// универсальный ретрай с небольшим бэкоффом
async function withRetry<T>(fn: () => Promise<T>, attempts = 3, delayMs = 500): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e: any) {
      lastErr = e;
      const msg = String(e?.message || '');
      const code = Number(e?.code);
      if (i < attempts - 1 && (code === -32011 || /backend.+healthy/i.test(msg) || /timeout/i.test(msg))) {
        await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
        continue;
      }
      break;
    }
  }
  throw lastErr;
}

/** ===== Page ===== */

export default function JarPublicPage() {
  const mounted = useMounted();
  const publicClient = usePublicClient();
  const { isConnected } = useAccount();
  const params = useParams<{ address: string }>();
  const jar = params.address as `0x${string}`;

  // ===== amount / price / UI =====
  const [ethAmount, setEthAmount] = useState('0.0001');
  const [ethUsd, setEthUsd] = useState<number | null>(null);
  const [usdApprox, setUsdApprox] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [copied, setCopied] = useState(false);

  // ===== tips feed =====
  const [tips, setTips] = useState<TipItem[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);

  // адрес -> имя (.eth/.base) кеш
  const [nameMap, setNameMap] = useState<Record<string, string | null>>({});

  // ===== helpers =====
  const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
  const displayName = (a: `0x${string}`) => {
    const n = nameMap[a.toLowerCase()];
    return n ?? shortAddr(a);
  };
  const fmtEth = (wei: bigint) => {
    const eth = Number(formatEther(wei));
    return eth.toFixed(6);
  };
  const fmtUsd = (wei: bigint) => {
    if (!ethUsd) return '—';
    const eth = Number(formatEther(wei));
    const usd = eth * ethUsd;
    return usd < 0.01 ? '<$0.01' : `$${usd.toFixed(2)}`;
  };

  /** ===== ETH price with caching ===== */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
          { cache: 'no-store' }
        );
        const j = await r.json();
        const price = j?.ethereum?.usd as number | undefined;
        if (alive && price) {
          setEthUsd(price);
          try {
            localStorage.setItem('eth_usd_price', JSON.stringify({ price, ts: Date.now() }));
          } catch {}
        }
      } catch {
        try {
          const raw = localStorage.getItem('eth_usd_price');
          if (raw) {
            const { price } = JSON.parse(raw);
            if (price) setEthUsd(price);
          }
        } catch {}
      }
    })();
    const id = setInterval(() => {
      fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd', {
        cache: 'no-store',
      })
        .then((r) => r.json())
        .then((j) => {
          const p = j?.ethereum?.usd as number | undefined;
          if (p) setEthUsd(p);
        })
        .catch(() => {});
    }, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  /** ===== Debounced USD approximation ===== */
  const debounceIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceIdRef.current) clearTimeout(debounceIdRef.current);
    debounceIdRef.current = setTimeout(() => {
      if (ethUsd && Number(ethAmount) >= 0) {
        const usd = Number(ethAmount) * ethUsd;
        setUsdApprox(`≈ $${usd < 0.01 ? '<0.01' : usd.toFixed(2)}`);
      } else {
        setUsdApprox(null);
      }
    }, 180);
    return () => {
      if (debounceIdRef.current) clearTimeout(debounceIdRef.current);
    };
  }, [ethAmount, ethUsd]);

  /** ===== Stable USD presets (1/5/10/50) ===== */
  const presetUsd = (usd: number) => {
    if (!ethUsd) return;
    const eth = usd / ethUsd;
    const fixed = Math.max(0, Number(eth.toFixed(6)));
    setEthAmount(String(fixed));
  };

  /** ===== Input validation (ETH) ===== */
  const onAmountChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const v = e.target.value.trim();
    // Разрешаем только цифры + одна точка, до 18 знаков после точки
    if (!/^(\d+(\.\d{0,18})?|\.\d{0,18})?$/.test(v)) return;
    const normalized = v.replace(/^0+(\d)/, '$1');
    setEthAmount(normalized);
  };

  /** ===== Send tip (динамический импорт, чтобы не тащить в SSR) ===== */
  const canSend = useMemo(
    () => isConnected && !!ethAmount && Number(ethAmount) > 0 && !cooldown,
    [isConnected, ethAmount, cooldown]
  );

  const onSend = async () => {
    if (!canSend) return;
    try {
      setPending(true);
      setCooldown(true);
      const { sendTip } = await import('@/actions/sendTip.client');
      const res = await sendTip({
        jarAddress: jar,
        valueWei: parseEther(ethAmount),
        message: message || '',
      });
      if (res.success) {
        setMessage('');
        void loadTips(true);
      } else {
        console.error(res.error || 'Failed to send tip');
      }
    } catch (e: any) {
      console.error(e?.message || e);
    } finally {
      setPending(false);
      setTimeout(() => setCooldown(false), 1200);
    }
  };

  /** ===== Read Tipped logs (windowed + withRetry) ===== */
  async function loadTips(silent = false) {
    if (!publicClient) return;
    if (!silent) setLoadingFeed(true);

    try {
      const latest = await withRetry(() => publicClient.getBlockNumber());
      let to = latest;
      let window = 15_000n; // окно поменьше
      let chunks = 0;
      const maxChunks = 6; // и меньше чанков
      const acc: TipItem[] = [];

      while (to >= 0n && acc.length < 20 && chunks < maxChunks) {
        const from = to > window ? to - window : 0n;

        try {
          const logs = await withRetry(() =>
            publicClient.getLogs({ address: jar, fromBlock: from, toBlock: to })
          );

          for (const lg of logs) {
            try {
              // Преобразуем readonly topics в ожидаемый tuple
              const topics =
                (lg.topics && lg.topics.length > 0
                  ? ([lg.topics[0] as `0x${string}`, ...(lg.topics.slice(1) as `0x${string}`[])] as
                      [] | [`0x${string}`, ...`0x${string}`[]])
                  : ([] as []));
              const data = ((lg as any).data ?? '0x') as `0x${string}`;

              const ev = decodeEventLog({
                abi: TIPJAR_ABI as any,
                data,
                topics,
              });
              if (ev.eventName !== 'Tipped') continue;

              const args: any = ev.args || {};
              const fromAddr = (args.from ||
                '0x0000000000000000000000000000000000000000') as `0x${string}`;
              const amountBI = (args.amount ?? 0n) as bigint;
              const msg = sanitizeMessage(args.message ?? '');

              acc.push({
                txHash: (lg.transactionHash || '0x') as Hex,
                from: fromAddr,
                amountWei: amountBI,
                message: msg,
                blockNumber: lg.blockNumber ?? 0n,
              });
            } catch {
              // не наше событие
            }
          }
        } catch (err: any) {
          const msg = String(err?.message || '');
          const code = Number(err?.code);
          if (msg.includes('no backend is currently healthy') || code === -32011) {
            window = window / 2n || 1n; // бэкофф по окну
            continue;
          } else {
            throw err;
          }
        }

        to = from > 0n ? from - 1n : 0n;
        chunks++;
      }

      acc.sort((a, b) => Number(b.blockNumber - a.blockNumber));
      setTips(acc.slice(0, 20));
    } catch (e) {
      console.error('Failed to load tips:', e);
    } finally {
      if (!silent) setLoadingFeed(false);
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      await loadTips();
    })();
    const id = setInterval(() => alive && loadTips(true), 30_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicClient, jar]);

  /** ===== resolve names (ens/basename) ===== */
  useEffect(() => {
    const lower = (m: Record<string, string | null>) =>
      Object.fromEntries(Object.entries(m).map(([k, v]) => [k.toLowerCase(), v]));
    const known = lower(nameMap);
    const unique = Array.from(new Set(tips.map((t) => t.from.toLowerCase()))).slice(0, 25);
    const missing = unique.filter((a) => !(a in known));
    if (missing.length === 0) return;

    (async () => {
      const updates: Record<string, string | null> = {};
      // ограничим параллелизм до 3
      const queue = [...missing];
      const workers = Array.from({ length: 3 }, async () => {
        while (queue.length) {
          const addrL = queue.shift()!;
          const addr = addrL as `0x${string}`;
          const name = await getPrimaryName(addr);
          updates[addrL] = name; // .eth / .base / null
        }
      });
      await Promise.all(workers);
      setNameMap((prev) => ({ ...prev, ...updates }));
    })();
  }, [tips, nameMap]);

  /** ===== Copy helpers ===== */
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(jar);
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    } catch {
      // ignore
    }
  };

  if (!mounted) return null;

  return (
    <main className="relative z-0 min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <CursorAura />

      {/* ЦЕНТРАЛЬНАЯ КОЛОНКА */}
      <div className="mx-auto w-full max-w-3xl">
        {/* Top bar: back + wallet */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="rounded-md bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15"
          >
            ← Back to Home
          </Link>
          <WalletButton />
        </div>

        {/* Network + Jar address (с Copy) */}
        <p className="mb-3 text-sm text-neutral-400">
          Network: 8453 (Base Mainnet)
          <br />
          Jar{' '}
          <span title={jar} className="inline-block max-w-[52ch] truncate align-bottom">
            {jar}
          </span>
          <button
            type="button"
            onClick={onCopy}
            className="ml-2 rounded-md bg-white/10 px-2 py-0.5 text-xs hover:bg-white/15"
          >
            {copied ? 'Copied ✓' : 'Copy'}
          </button>
        </p>

        {/* Form card */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
          <label className="mb-2 block text-sm font-medium">Amount (ETH)</label>
          <div className="mb-2 flex items-center gap-2">
            <input
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 outline-none ring-0 focus:border-[#2563eb]"
              value={ethAmount}
              onChange={onAmountChange}
              inputMode="decimal"
              placeholder="0.0001"
            />
            <div className="shrink-0 text-sm text-neutral-400">{usdApprox ?? ' '}</div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {[1, 5, 10, 50].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => presetUsd(v)}
                disabled={!ethUsd || pending}
                className="rounded-md bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15 disabled:opacity-50"
                title={ethUsd ? '' : 'Fetching ETH price…'}
              >
                ${v}
              </button>
            ))}
          </div>

          <label className="mb-2 block text-sm font-medium">Message (optional)</label>
          <textarea
            className="mb-4 h-32 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 outline-none ring-0 focus:border-[#2563eb]"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Say something nice ✨"
          />

          <button
            type="button"
            onClick={onSend}
            disabled={!canSend || pending}
            aria-busy={pending}
            className="rounded-xl bg-[#0052FF] px-5 py-2.5 font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50 hover:opacity-90 active:opacity-80"
          >
            {pending ? 'Sending…' : cooldown ? 'Please wait…' : 'Send Tip'}
          </button>
        </section>

        {/* Tips card */}
        <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Recent tips</h3>
            <button
              type="button"
              onClick={() => loadTips()}
              disabled={loadingFeed}
              className="rounded-md bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15 disabled:opacity-60"
            >
              {loadingFeed ? 'Loading…' : 'Refresh'}
            </button>
          </div>

          {tips.length === 0 ? (
            <div className="text-sm text-neutral-400">No tips yet — be the first!</div>
          ) : (
            <ul className="divide-y divide-white/10">
              {tips.map((t) => {
                const name = nameMap[t.from.toLowerCase()] || null;
                return (
                  <li key={`${t.txHash}`} className="py-3">
                    <div className="flex items-start gap-3">
                      <Avatar name={name} address={t.from} size={28} />
                      <div className="flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <div className="text-sm">
                            <div className="font-medium">
                              {fmtEth(t.amountWei)} ETH
                              <span className="ml-2 text-neutral-400">({fmtUsd(t.amountWei)})</span>
                              {t.message && (
                                <span className="text-neutral-400"> — “{t.message}”</span>
                              )}
                            </div>
                            <div className="mt-0.5 text-xs text-neutral-400">
                              From{' '}
                              <span className="rounded bg-white/5 px-1.5 py-0.5">
                                {displayName(t.from)}
                              </span>
                              {' · '}Block #{t.blockNumber.toString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <a
                              href={`https://basescan.org/tx/${t.txHash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-md bg-white/10 px-2 py-1 text-xs hover:bg-white/15 underline"
                            >
                              View tx
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Слоган снизу, центрируется вместе с колонкой */}
        <div className="mt-8">
          <Slogan />
        </div>
      </div>
    </main>
  );
}
