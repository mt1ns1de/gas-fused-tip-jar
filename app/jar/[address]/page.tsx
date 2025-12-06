'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAccount, usePublicClient } from 'wagmi';
import CursorAura from '@/components/CursorAura';
import WalletButton from '@/components/WalletButton';
import {
  formatEther,
  formatGwei,
  Hex,
  parseEther,
  parseAbiItem,
} from 'viem';
import { TIPJAR_ABI } from '@/lib/abiTipJar';
import { getPrimaryName } from '@/lib/identity';
import Avatar from '@/components/Avatar';
import Slogan from '@/components/Slogan';
import TipSuccessModal from '@/components/TipSuccessModal';
import { withdrawFromJar } from '@/actions/createJar.client';

/** ===== Utils ===== */

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

async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  delayMs = 500,
): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e: any) {
      lastErr = e;
      const msg = String(e?.message || '');
      const code = Number(e?.code);
      if (
        i < attempts - 1 &&
        (code === -32011 ||
          /backend.+healthy/i.test(msg) ||
          /timeout/i.test(msg))
      ) {
        await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
        continue;
      }
      break;
    }
  }
  throw lastErr;
}

/** ===== Owner cache (5 min TTL) ===== */

const OWNER_CACHE_KEY = 'jar_owner_cache_v1';
type OwnerCache = Record<string, { owner: string; ts: number }>;

function getOwnerCache(): OwnerCache {
  try {
    const raw = localStorage.getItem(OWNER_CACHE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as OwnerCache;
  } catch {
    return {};
  }
}
function setOwnerCache(jar: string, owner: string) {
  try {
    const cache = getOwnerCache();
    cache[jar.toLowerCase()] = { owner, ts: Date.now() };
    localStorage.setItem(OWNER_CACHE_KEY, JSON.stringify(cache));
  } catch {}
}
function getCachedOwner(jar: string): string | null {
  try {
    const cache = getOwnerCache();
    const rec = cache[jar.toLowerCase()];
    if (!rec) return null;
    const age = Date.now() - rec.ts;
    if (age > 5 * 60_000) return null; // 5 minutes
    return rec.owner;
  } catch {
    return null;
  }
}

/** ===== Tip cache in localStorage (per jar) ===== */

const TIP_CACHE_KEY = 'jar_tip_cache_v1';

type TipItemSerialized = {
  txHash: string;
  from: string;
  amountWei: string;
  message: string;
  blockNumber: string;
};

type TipCacheRecord = {
  lastBlock: string; // последний блок, до которого мы уже ходили
  tips: TipItemSerialized[];
};

type TipCacheAll = Record<string, TipCacheRecord>;

function serializeTips(tips: TipItem[]): TipItemSerialized[] {
  return tips.map((t) => ({
    txHash: t.txHash,
    from: t.from,
    amountWei: t.amountWei.toString(),
    message: t.message,
    blockNumber: t.blockNumber.toString(),
  }));
}

function deserializeTips(arr: TipItemSerialized[]): TipItem[] {
  return arr.map((t) => ({
    txHash: t.txHash as Hex,
    from: t.from as `0x${string}`,
    amountWei: BigInt(t.amountWei),
    message: t.message,
    blockNumber: BigInt(t.blockNumber),
  }));
}

function getTipCacheAll(): TipCacheAll {
  try {
    const raw = localStorage.getItem(TIP_CACHE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as TipCacheAll;
  } catch {
    return {};
  }
}

function getTipCacheForJar(jar: string): TipCacheRecord | null {
  try {
    const all = getTipCacheAll();
    return all[jar.toLowerCase()] || null;
  } catch {
    return null;
  }
}

function setTipCacheForJar(jar: string, rec: TipCacheRecord) {
  try {
    const all = getTipCacheAll();
    all[jar.toLowerCase()] = rec;
    localStorage.setItem(TIP_CACHE_KEY, JSON.stringify(all));
  } catch {}
}

/** ===== Log filter + rate-limit helpers ===== */

const TIPPED_EVENT = parseAbiItem(
  'event Tipped(address indexed from, uint256 amount, string message)',
);

const sleep = (ms: number) =>
  new Promise((r) => setTimeout(r, ms + Math.random() * 200));
let tipsLoadingLock = false;
const isPageVisible = () =>
  typeof document !== 'undefined'
    ? document.visibilityState === 'visible'
    : true;

/** ===== Page ===== */

export default function JarPublicPage() {
  const mounted = useMounted();
  const publicClient = usePublicClient();
  const { isConnected, address } = useAccount();
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

  // success modal
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastTx, setLastTx] = useState<`0x${string}` | string | null>(null);

  // ===== tips feed =====
  const [tips, setTips] = useState<TipItem[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);

  // адрес -> имя (.eth/.base) кеш
  const [nameMap, setNameMap] = useState<Record<string, string | null>>({});

  // ===== owner panel state =====
  const [owner, setOwner] = useState<string | null>(null);
  const [jarBalance, setJarBalance] = useState<bigint | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const canWithdraw =
    !!owner && !!address && owner.toLowerCase() === address.toLowerCase();

  // ===== локальные ошибки (красиво, не навязчиво) =====
  const [tipError, setTipError] = useState<string | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  // ===== fuse / gas panel =====
  const [jarCapGwei, setJarCapGwei] = useState<number | null>(null);
  const [netGasGwei, setNetGasGwei] = useState<number | null>(null);

  // ===== helpers =====
  const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
  const displayName = (a: `0x${string}`) => {
    const n = nameMap[a.toLowerCase()];
    return n ?? shortAddr(a);
  };
  const fmtEth = (wei: bigint) => Number(formatEther(wei)).toFixed(6);
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
          { cache: 'no-store' },
        );
        const j = await r.json();
        const price = j?.ethereum?.usd as number | undefined;
        if (alive && price) {
          setEthUsd(price);
          try {
            localStorage.setItem(
              'eth_usd_price',
              JSON.stringify({ price, ts: Date.now() }),
            );
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
      fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
        {
          cache: 'no-store',
        },
      )
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
    if (!/^(\d+(\.\d{0,18})?|\.\d{0,18})?$/.test(v)) return;
    const normalized = v.replace(/^0+(\d)/, '$1');
    setEthAmount(normalized);
  };

  /** ===== Send tip ===== */
  const canSend = useMemo(
    () =>
      isConnected && !!ethAmount && Number(ethAmount) > 0 && !cooldown,
    [isConnected, ethAmount, cooldown],
  );

  const onSend = async () => {
    if (!canSend) return;
    setTipError(null);
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
        setLastTx(res.txHash || null);
        setShowSuccess(true);
        // parallel refresh
        void loadTipsIncremental(true);
        void refreshOwnerPanel(true);
        void refreshGasPanel(true);
      } else {
        setTipError(res.error || 'Failed to send tip.');
      }
    } catch (e: any) {
      setTipError(e?.message || 'Failed to send tip.');
    } finally {
      setPending(false);
      setTimeout(() => setCooldown(false), 1200);
    }
  };

  /** ===== Fuse ratio + UX text ===== */
  const fuseRatio = useMemo(() => {
    if (
      jarCapGwei === null ||
      netGasGwei === null ||
      jarCapGwei <= 0 ||
      netGasGwei <= 0
    )
      return null;
    return jarCapGwei / netGasGwei;
  }, [jarCapGwei, netGasGwei]);

  const fuseBadge = useMemo(() => {
    if (!fuseRatio) return null;

    if (fuseRatio < 1) {
      return {
        label: 'Cap below gas',
        className:
          'border-amber-400/50 bg-amber-500/10 text-amber-100',
        description:
          'Gas is currently above this jar’s fuse cap. Some tips may revert until fees cool down.',
      };
    }

    if (fuseRatio <= 1.7) {
      return {
        label: 'Balanced fuse',
        className:
          'border-emerald-400/40 bg-emerald-500/10 text-emerald-100',
        description:
          'Fuse cap sits in a balanced zone. Supporters stay protected while tips usually go through.',
      };
    }

    return {
      label: 'Loose fuse',
      className: 'border-sky-400/40 bg-sky-500/10 text-sky-100',
      description:
        'Fuse cap is well above current gas. Tips are unlikely to fail on gas, but fees can be higher if gas spikes later.',
    };
  }, [fuseRatio]);

  const fuseDescription = fuseBadge?.description;

  /** ===== Dedup helper ===== */
  function dedupAndSortTips(arr: TipItem[]): TipItem[] {
    const map = new Map<string, TipItem>();
    for (const t of arr) {
      const k = `${t.txHash}-${t.from}-${t.amountWei.toString()}-${t.blockNumber.toString()}`;
      map.set(k, t);
    }
    const unique = Array.from(map.values());
    unique.sort((a, b) => Number(b.blockNumber - a.blockNumber));
    return unique;
  }

  /** ===== Tips loader: shallow (быстрый) ===== */
  async function loadTipsShallow(silent = false) {
    if (!publicClient) return;
    if (!isPageVisible()) return;
    if (tipsLoadingLock) return;
    tipsLoadingLock = true;
    if (!silent) setLoadingFeed(true);

    try {
      const latest = await withRetry(() => publicClient.getBlockNumber());
      let to = latest;
      let window = 4_000n; // небольшое окно
      let chunks = 0;
      const maxChunks = 4; // всего ~16k блоков
      const acc: TipItem[] = [];

      let backoffMs = 600;

      while (to >= 0n && chunks < maxChunks) {
        const from = to > window ? to - window : 0n;

        try {
          const logs = await publicClient.getLogs({
            address: jar,
            fromBlock: from,
            toBlock: to,
            event: TIPPED_EVENT,
          });

          for (const lg of logs) {
            try {
              const ev = lg as unknown as {
                args?: {
                  from?: `0x${string}`;
                  amount?: bigint;
                  message?: string;
                };
                transactionHash?: Hex;
                blockNumber?: bigint;
              };

              const args = ev.args || {};
              const fromAddr = args.from as `0x${string}` | undefined;
              const amountBI = args.amount as bigint | undefined;

              if (!fromAddr || amountBI === undefined) continue;

              const msg = sanitizeMessage(args.message ?? '');

              acc.push({
                txHash: ev.transactionHash || ('0x' as Hex),
                from: fromAddr,
                amountWei: amountBI,
                message: msg,
                blockNumber: ev.blockNumber ?? 0n,
              });
            } catch {
              // skip
            }
          }

          backoffMs = 600;
        } catch (err: any) {
          const msg = String(err?.message || '');
          const code = Number(err?.code);
          if (
            msg.includes('over rate limit') ||
            code === -32016 ||
            code === 429
          ) {
            window = window / 2n || 1n;
            await sleep(backoffMs);
            backoffMs = Math.min(backoffMs * 2, 5000);
            continue;
          }
          if (
            msg.includes('no backend is currently healthy') ||
            code === -32011 ||
            /timeout/i.test(msg)
          ) {
            window = window / 2n || 1n;
            await sleep(backoffMs);
            backoffMs = Math.min(backoffMs * 2, 5000);
            continue;
          }
          throw err;
        }

        to = from > 0n ? from - 1n : 0n;
        chunks++;
      }

      const merged = dedupAndSortTips(acc);
      setTips(merged);
      // Шаллоу не кладём в кэш, кэш будет от deep
    } catch (e) {
      if (!silent) console.error('Failed to load shallow tips:', e);
    } finally {
      if (!silent) setLoadingFeed(false);
      tipsLoadingLock = false;
    }
  }

  /** ===== Tips loader: incremental (от lastBlock в кэше) ===== */
  async function loadTipsIncremental(silent = false) {
    if (!publicClient) return;
    if (!isPageVisible()) return;
    if (tipsLoadingLock) return;
    const cached = getTipCacheForJar(jar);
    if (!cached) {
      // если нет кэша — просто быстрый свежий слой
      return loadTipsShallow(silent);
    }

    tipsLoadingLock = true;
    if (!silent) setLoadingFeed(true);

    try {
      const latest = await withRetry(() => publicClient.getBlockNumber());
      const fromBlockNew = BigInt(cached.lastBlock || '0') + 1n;

      let acc = deserializeTips(cached.tips);

      if (fromBlockNew <= latest) {
        try {
          const logs = await publicClient.getLogs({
            address: jar,
            fromBlock: fromBlockNew,
            toBlock: latest,
            event: TIPPED_EVENT,
          });

          const fresh: TipItem[] = [];
          for (const lg of logs) {
            try {
              const ev = lg as unknown as {
                args?: {
                  from?: `0x${string}`;
                  amount?: bigint;
                  message?: string;
                };
                transactionHash?: Hex;
                blockNumber?: bigint;
              };

              const args = ev.args || {};
              const fromAddr = args.from as `0x${string}` | undefined;
              const amountBI = args.amount as bigint | undefined;

              if (!fromAddr || amountBI === undefined) continue;

              const msg = sanitizeMessage(args.message ?? '');

              fresh.push({
                txHash: ev.transactionHash || ('0x' as Hex),
                from: fromAddr,
                amountWei: amountBI,
                message: msg,
                blockNumber: ev.blockNumber ?? 0n,
              });
            } catch {
              // skip
            }
          }

          acc = acc.concat(fresh);
        } catch (err) {
          if (!silent) console.error('Failed to load new tips:', err);
        }
      }

      const merged = dedupAndSortTips(acc);
      setTips(merged);

      setTipCacheForJar(jar, {
        lastBlock: latest.toString(),
        tips: serializeTips(merged),
      });
    } catch (e) {
      if (!silent) console.error('Failed to load incremental tips:', e);
    } finally {
      if (!silent) setLoadingFeed(false);
      tipsLoadingLock = false;
    }
  }

  /** ===== Tips loader: deep scan (all-time, в фоне) ===== */
  async function loadTipsDeep(silent = false) {
    if (!publicClient) return;
    if (!isPageVisible()) return;
    if (tipsLoadingLock) return;

    // если уже есть кэш — глубокий скан не нужен
    const existing = getTipCacheForJar(jar);
    if (existing) {
      // но можем догрузить последние блоки
      return loadTipsIncremental(silent);
    }

    tipsLoadingLock = true;
    if (!silent) setLoadingFeed(true);

    try {
      const latest = await withRetry(() => publicClient.getBlockNumber());
      let to = latest;
      let window = 10_000n; // окно побольше
      let chunks = 0;
      const maxChunks = 200; // до ~2M блоков
      const deepAcc: TipItem[] = [];

      let backoffMs = 600;

      while (to >= 0n && chunks < maxChunks) {
        const from = to > window ? to - window : 0n;

        try {
          const logs = await publicClient.getLogs({
            address: jar,
            fromBlock: from,
            toBlock: to,
            event: TIPPED_EVENT,
          });

          for (const lg of logs) {
            try {
              const ev = lg as unknown as {
                args?: {
                  from?: `0x${string}`;
                  amount?: bigint;
                  message?: string;
                };
                transactionHash?: Hex;
                blockNumber?: bigint;
              };

              const args = ev.args || {};
              const fromAddr = args.from as `0x${string}` | undefined;
              const amountBI = args.amount as bigint | undefined;

              if (!fromAddr || amountBI === undefined) continue;

              const msg = sanitizeMessage(args.message ?? '');

              deepAcc.push({
                txHash: ev.transactionHash || ('0x' as Hex),
                from: fromAddr,
                amountWei: amountBI,
                message: msg,
                blockNumber: ev.blockNumber ?? 0n,
              });
            } catch {
              // skip
            }
          }

          backoffMs = 600;
        } catch (err: any) {
          const msg = String(err?.message || '');
          const code = Number(err?.code);

          if (
            msg.includes('over rate limit') ||
            code === -32016 ||
            code === 429
          ) {
            window = window / 2n || 1n;
            await sleep(backoffMs);
            backoffMs = Math.min(backoffMs * 2, 5000);
            continue;
          }

          if (
            msg.includes('no backend is currently healthy') ||
            code === -32011 ||
            /timeout/i.test(msg)
          ) {
            window = window / 2n || 1n;
            await sleep(backoffMs);
            backoffMs = Math.min(backoffMs * 2, 5000);
            continue;
          }

          throw err;
        }

        to = from > 0n ? from - 1n : 0n;
        chunks++;
      }

      const merged = dedupAndSortTips(deepAcc);
      setTips(merged);

      setTipCacheForJar(jar, {
        lastBlock: latest.toString(),
        tips: serializeTips(merged),
      });
    } catch (e) {
      if (!silent) console.error('Failed to load deep tips:', e);
    } finally {
      if (!silent) setLoadingFeed(false);
      tipsLoadingLock = false;
    }
  }

  /** ===== Fast owner panel (cache + parallel) ===== */
  async function refreshOwnerPanel(silent = false) {
    if (!publicClient) return;

    const cached = getCachedOwner(jar);
    if (cached && !owner) {
      setOwner(cached);
    }

    try {
      const ownerPromise = publicClient.readContract({
        address: jar,
        abi: [
          {
            type: 'function',
            name: 'owner',
            inputs: [],
            outputs: [{ type: 'address' }],
            stateMutability: 'view',
          },
        ] as const,
        functionName: 'owner',
      }) as Promise<string>;

      const balancePromise = publicClient.getBalance({ address: jar });

      const [ownRes, balRes] = await Promise.allSettled([
        ownerPromise,
        balancePromise,
      ]);

      if (ownRes.status === 'fulfilled') {
        const own = ownRes.value;
        setOwner(own);
        setOwnerCache(jar, own);
      }
      if (balRes.status === 'fulfilled') {
        setJarBalance(balRes.value);
      }
    } catch (e) {
      if (!silent) console.error('Owner panel refresh failed:', e);
    }
  }

  /** ===== Jar fuse + current gas ===== */
  async function refreshGasPanel(silent = false) {
    if (!publicClient) return;

    try {
      const [capWei, baseWei] = await Promise.all([
        publicClient.readContract({
          address: jar,
          abi: TIPJAR_ABI as any,
          functionName: 'maxGasPriceWei',
          args: [] as const,
        }),
        publicClient.getGasPrice(),
      ]);

      setJarCapGwei(Number(formatGwei(capWei as bigint)));
      setNetGasGwei(Number(formatGwei(baseWei)));
    } catch (e) {
      if (!silent) console.error('Gas panel refresh failed:', e);
    }
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      // сразу пробуем вытащить кэш tips и показать мгновенно
      try {
        const cached = getTipCacheForJar(jar);
        if (cached) {
          const des = deserializeTips(cached.tips);
          setTips(
            des.sort((a, b) => Number(b.blockNumber - a.blockNumber)),
          );
          // поверх кэша просто дотягиваем новые
          void loadTipsIncremental(true);
        } else {
          // нет кэша → быстрый слой, потом глубокий в фоне
          await loadTipsShallow(false);
          void loadTipsDeep(true);
        }
      } catch {
        await loadTipsShallow(false);
        void loadTipsDeep(true);
      }

      void refreshOwnerPanel(true);
      void refreshGasPanel(true);

      const idOwner = setInterval(() => {
        if (!alive || !isPageVisible()) return;
        void refreshOwnerPanel(true);
      }, 20_000);

      const idGas = setInterval(() => {
        if (!alive || !isPageVisible()) return;
        void refreshGasPanel(true);
      }, 30_000);

      const idFeed = setInterval(() => {
        if (!alive || !isPageVisible()) return;
        void loadTipsIncremental(true);
      }, 45_000);

      const onVisibility = () => {
        if (isPageVisible()) {
          void refreshOwnerPanel(true);
          void refreshGasPanel(true);
          void loadTipsIncremental(true);
        }
      };
      document.addEventListener('visibilitychange', onVisibility);

      const cleanup = () => {
        alive = false;
        clearInterval(idOwner);
        clearInterval(idGas);
        clearInterval(idFeed);
        document.removeEventListener('visibilitychange', onVisibility);
      };

      // @ts-expect-error – используем в return ниже
      (JarPublicPage as any)._cleanup = cleanup;
    })();

    return () => {
      const fn = (JarPublicPage as any)._cleanup;
      if (typeof fn === 'function') fn();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicClient, jar]);

  /** ===== resolve names (ens/basename) ===== */
  useEffect(() => {
    const lower = (m: Record<string, string | null>) =>
      Object.fromEntries(
        Object.entries(m).map(([k, v]) => [k.toLowerCase(), v]),
      );
    const known = lower(nameMap);
    const unique = Array.from(
      new Set(tips.map((t) => t.from.toLowerCase())),
    ).slice(0, 25);
    const missing = unique.filter((a) => !(a in known));
    if (missing.length === 0) return;

    (async () => {
      const updates: Record<string, string | null> = {};
      const queue = [...missing];
      const workers = Array.from({ length: 3 }, async () => {
        while (queue.length) {
          const addrL = queue.shift()!;
          const addr = addrL as `0x${string}`;
          const name = await getPrimaryName(addr);
          updates[addrL] = name;
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
    } catch {}
  };

  const publicLink = useMemo(() => {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/jar/${jar}`;
  }, [jar]);

  if (!mounted) return null;

  return (
    <main className="relative z-0 min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <CursorAura />

      {/* CENTRAL COLUMN */}
      <div className="mx-auto w-full max-w-3xl">
        {/* Top bar */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="rounded-md bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15"
          >
            ← Back to Home
          </Link>
          <WalletButton />
        </div>

        {/* Network + Jar address */}
        <p className="mb-3 text-sm text-neutral-400">
          Network: 8453 (Base Mainnet)
          <br />
          Jar{' '}
          <span
            title={jar}
            className="inline-block max-w-[52ch] truncate align-bottom"
          >
            {jar}
          </span>
          <button
            type="button"
            onClick={onCopy}
            className="ml-2 rounded-md bg.white/10 px-2 py-0.5 text-xs hover:bg-white/15"
          >
            {copied ? 'Copied ✓' : 'Copy'}
          </button>
        </p>

        {/* Fuse / gas state strip */}
        {jarCapGwei !== null && (
          <section className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-neutral-200 backdrop-blur-sm sm:text-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-neutral-300">
                  <span className="font-semibold text-white">
                    Jar fuse:
                  </span>{' '}
                  cap {jarCapGwei.toFixed(3)} gwei
                  {netGasGwei !== null && (
                    <>
                      {' · '}current base fee {netGasGwei.toFixed(3)} gwei
                    </>
                  )}
                </div>
                {fuseDescription && (
                  <div className="mt-1 text-[11px] text-neutral-400 sm:text-xs">
                    {fuseDescription}
                  </div>
                )}
              </div>
              {fuseBadge && (
                <span
                  className={
                    'inline-flex items-center rounded-full border px-3 py-1 text-[11px] sm:text-xs ' +
                    fuseBadge.className
                  }
                >
                  {fuseBadge.label}
                </span>
              )}
            </div>
          </section>
        )}

        {/* === OWNER PANEL (visible only to owner) === */}
        {canWithdraw && (
          <section className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-neutral-300">
                Owner panel
              </span>
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-4 text-sm">
              <div>
                <div className="text-neutral-400">Owner</div>
                <div
                  className="max-w-[56ch] truncate"
                  title={owner || '—'}
                >
                  {owner || '—'}
                </div>
              </div>
              <div>
                <div className="text-neutral-400">Jar balance</div>
                <div>
                  {jarBalance === null
                    ? '—'
                    : `${Number(formatEther(jarBalance)).toFixed(6)} ETH`}
                </div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => refreshOwnerPanel()}
                  className="rounded-md bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15"
                  disabled={withdrawing}
                >
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!canWithdraw) return;
                    setWithdrawError(null);
                    try {
                      setWithdrawing(true);
                      const res = await withdrawFromJar(jar);
                      if (!res.success) {
                        setWithdrawError(
                          res.error || 'Failed to withdraw funds.',
                        );
                      } else {
                        await refreshOwnerPanel(true);
                      }
                    } catch (e: any) {
                      setWithdrawError(
                        e?.message || 'Failed to withdraw funds.',
                      );
                    } finally {
                      setWithdrawing(false);
                    }
                  }}
                  disabled={withdrawing}
                  aria-busy={withdrawing}
                  className="rounded-xl bg-[#0052FF] px-4 py-2 font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50 hover:opacity-90 active:opacity-80"
                >
                  {withdrawing ? 'Withdrawing…' : 'Withdraw'}
                </button>
              </div>
            </div>

            {withdrawError && (
              <div className="mt-2 rounded-lg border border-red-400/30 bg-red-950/40 px-3 py-1 text-xs text-red-200">
                <div className="flex items-start gap-2">
                  <span className="mt-1 inline-block h-3 w-3 shrink-0 rounded-full bg-red-400/80" />
                  <div className="flex-1">{withdrawError}</div>
                  <button
                    onClick={() => setWithdrawError(null)}
                    className="ml-2 rounded-md bg-white/10 px-2 py-0.5 text-[11px] text-neutral-200 hover:bg-white/15"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Form card */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
          <label className="mb-2 block text-sm font-medium">
            Amount (ETH)
          </label>
          <div className="mb-2 flex items-center gap-2">
            <input
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 outline-none ring-0 focus:border-[#2563eb]"
              value={ethAmount}
              onChange={onAmountChange}
              inputMode="decimal"
              placeholder="0.0001"
            />
            <div className="shrink-0 text-sm text-neutral-400">
              {usdApprox ?? ' '}
            </div>
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

          <label className="mb-2 block text-sm font-medium">
            Message (optional)
          </label>
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
            {pending
              ? 'Sending…'
              : cooldown
              ? 'Please wait…'
              : 'Send Tip'}
          </button>

          {tipError && (
            <div className="mt-3 rounded-lg border border-red-400/30 bg-red-950/40 px-3 py-2 text-sm text-red-200">
              <div className="flex items-start gap-2">
                <span className="mt-1 inline-block h-3 w-3 shrink-0 rounded-full bg-red-400/80" />
                <div className="flex-1">{tipError}</div>
                <button
                  onClick={() => setTipError(null)}
                  className="ml-2 rounded-md bg-white/10 px-2 py-0.5 text-xs text-neutral-200 hover:bg-white/15"
                >
                  ×
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Tips card */}
        <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Recent tips</h3>
            <button
              type="button"
              onClick={() => loadTipsIncremental()}
              disabled={loadingFeed}
              className="rounded-md bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15 disabled:opacity-60"
            >
              {loadingFeed ? 'Loading…' : 'Refresh'}
            </button>
          </div>

          {tips.length === 0 ? (
            <div className="text-sm text-neutral-400">
              No tips yet. You can be the first one.
            </div>
          ) : (
            <ul className="divide-y divide-white/10">
              {tips.map((t) => {
                const name =
                  nameMap[t.from.toLowerCase()] || null;
                return (
                  <li key={`${t.txHash}`} className="py-3">
                    <div className="flex items-start gap-3">
                      <Avatar name={name} address={t.from} size={28} />
                      <div className="flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <div className="text-sm">
                            <div className="font-medium">
                              {fmtEth(t.amountWei)} ETH
                              <span className="ml-2 text-neutral-400">
                                ({fmtUsd(t.amountWei)})
                              </span>
                              {t.message && (
                                <span className="text-neutral-400">
                                  {' '}
                                  — “{t.message}”
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 text-xs text-neutral-400">
                              From{' '}
                              <span className="rounded bg-white/5 px-1.5 py-0.5">
                                {displayName(t.from)}
                              </span>
                              {' · '}Block #
                              {t.blockNumber.toString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <a
                              href={`https://basescan.org/tx/${t.txHash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-md bg-white/10 px-2 py-1 text-xs underline hover:bg-white/15"
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

        <div className="mt-8">
          <Slogan />
        </div>
      </div>

      {/* Success modal */}
      <TipSuccessModal
        open={showSuccess}
        onClose={() => setShowSuccess(false)}
        amountEth={ethAmount}
        txHash={lastTx || undefined}
        jarAddress={jar}
        shareLink={publicLink}
      />
    </main>
  );
}
