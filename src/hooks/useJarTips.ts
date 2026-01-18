import { useCallback, useEffect, useState } from 'react';
import type { Hex, PublicClient } from 'viem';
import { parseAbiItem } from 'viem';

export type TipItem = {
  txHash: Hex;
  from: `0x${string}`;
  amountWei: bigint;
  message: string;
  blockNumber: bigint;
};

/* ========================= Internal utils ========================= */

function sanitizeMessage(s: unknown, max = 240): string {
  if (!s || typeof s !== 'string') return '';
  const stripped = s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  if (stripped.length <= max) return stripped;
  return stripped.slice(0, max - 1) + '…';
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

/* ========================= Tip cache in localStorage (per jar) ========================= */

const TIP_CACHE_KEY = 'jar_tip_cache_v1';

type TipItemSerialized = {
  txHash: string;
  from: string;
  amountWei: string;
  message: string;
  blockNumber: string;
};

type TipCacheRecord = {
  // last block up to which we have already scanned
  lastBlock: string;
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
  } catch {
    // ignore
  }
}

/* ========================= Logs / rate limiting helpers ========================= */

const TIPPED_EVENT = parseAbiItem(
  'event Tipped(address indexed from, uint256 amount, string message)',
);

const sleep = (ms: number) =>
  new Promise((r) => setTimeout(r, ms + Math.random() * 200));

// Shared lock so we don’t run multiple heavy scans at once.
let tipsLoadingLock = false;

const isPageVisible = () =>
  typeof document !== 'undefined'
    ? document.visibilityState === 'visible'
    : true;

/* ========================= Core helpers ========================= */

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

/* ========================= Hook: useJarTips ========================= */

type UseJarTipsResult = {
  tips: TipItem[];
  loadingFeed: boolean;
  justRefreshed: boolean;
  refreshIncremental: (silent?: boolean) => Promise<void>;
  handleRefreshClick: () => Promise<void>;
};

export function useJarTips(
  jar: `0x${string}`,
  publicClient: PublicClient | undefined,
): UseJarTipsResult {
  const [tips, setTips] = useState<TipItem[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [justRefreshed, setJustRefreshed] = useState(false);

  /* ===== Shallow scan (fast) ===== */
  const loadTipsShallow = useCallback(
    async (silent = false) => {
      if (!publicClient) return;
      if (!isPageVisible()) return;
      if (tipsLoadingLock) return;
      tipsLoadingLock = true;
      if (!silent) setLoadingFeed(true);

      try {
        const latest = await withRetry(() => publicClient.getBlockNumber());
        let to = latest;
        let window = 4_000n; // small window for fast load
        let chunks = 0;
        const maxChunks = 4; // ~16k blocks total
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
                // skip bad log
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
        // shallow scan does not write cache; deep scan will
      } catch (e) {
        if (!silent) console.error('Failed to load shallow tips:', e);
      } finally {
        if (!silent) setLoadingFeed(false);
        tipsLoadingLock = false;
      }
    },
    [jar, publicClient],
  );

  /* ===== Incremental scan (from lastBlock in cache) ===== */
  const loadTipsIncremental = useCallback(
    async (silent = false) => {
      if (!publicClient) return;
      if (!isPageVisible()) return;
      if (tipsLoadingLock) return;
      const cached = getTipCacheForJar(jar);
      if (!cached) {
        // no cache yet → do a fast shallow scan
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
    },
    [jar, publicClient, loadTipsShallow],
  );

  /* ===== Deep scan (all-time, background) ===== */
  const loadTipsDeep = useCallback(
    async (silent = false) => {
      if (!publicClient) return;
      if (!isPageVisible()) return;
      if (tipsLoadingLock) return;

      const existing = getTipCacheForJar(jar);
      if (existing) {
        // if cache already exists, deep scan is unnecessary
        return loadTipsIncremental(silent);
      }

      tipsLoadingLock = true;
      if (!silent) setLoadingFeed(true);

      try {
        const latest = await withRetry(() => publicClient.getBlockNumber());
        let to = latest;
        let window = 10_000n; // larger window for deep scan
        let chunks = 0;
        const maxChunks = 200; // up to ~2M blocks
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
    },
    [jar, publicClient, loadTipsIncremental],
  );

  /* ===== Bootstrap effect (initial load + interval) ===== */
  useEffect(() => {
    if (!publicClient) return;

    let alive = true;
    let idFeed: ReturnType<typeof setInterval> | null = null;

    const run = async () => {
      try {
        // try to hydrate from cache immediately
        try {
          const cached = getTipCacheForJar(jar);
          if (cached) {
            const des = deserializeTips(cached.tips);
            setTips(
              des.sort((a, b) => Number(b.blockNumber - a.blockNumber)),
            );
            // extend with incremental updates
            void loadTipsIncremental(true);
          } else {
            // no cache → shallow first, deep in background
            await loadTipsShallow(false);
            void loadTipsDeep(true);
          }
        } catch {
          await loadTipsShallow(false);
          void loadTipsDeep(true);
        }
      } catch {
        // ignore bootstrap errors
      }

      idFeed = setInterval(() => {
        if (!alive || !isPageVisible()) return;
        void loadTipsIncremental(true);
      }, 45_000);
    };

    void run();

    const onVisibility = () => {
      if (isPageVisible()) {
        void loadTipsIncremental(true);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      alive = false;
      if (idFeed) clearInterval(idFeed);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [publicClient, jar, loadTipsIncremental, loadTipsShallow, loadTipsDeep]);

  /* ===== Public refresh helpers ===== */

  const refreshIncremental = useCallback(
    async (silent = false) => {
      await loadTipsIncremental(silent);
    },
    [loadTipsIncremental],
  );

  const handleRefreshClick = useCallback(async () => {
    if (loadingFeed) return;
    await loadTipsIncremental(false);
    setJustRefreshed(true);
    setTimeout(() => setJustRefreshed(false), 900);
  }, [loadingFeed, loadTipsIncremental]);

  return {
    tips,
    loadingFeed,
    justRefreshed,
    refreshIncremental,
    handleRefreshClick,
  };
}
