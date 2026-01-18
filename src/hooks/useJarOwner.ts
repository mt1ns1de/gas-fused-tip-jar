import { useCallback, useEffect, useState } from 'react';
import type { PublicClient } from 'viem';

type UseJarOwnerResult = {
  owner: string | null;
  jarBalance: bigint | null;
  refreshOwner: (silent?: boolean) => Promise<void>;
};

/* ===== Owner cache (5 min TTL) ===== */

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
  } catch {
    // ignore
  }
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

export function useJarOwner(
  jar: `0x${string}`,
  publicClient: PublicClient | undefined,
): UseJarOwnerResult {
  const [owner, setOwner] = useState<string | null>(null);
  const [jarBalance, setJarBalance] = useState<bigint | null>(null);

  const refreshOwner = useCallback(
    async (silent = false) => {
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
    },
    [jar, owner, publicClient],
  );

  useEffect(() => {
    if (!publicClient) return;

    let alive = true;
    let idOwner: ReturnType<typeof setInterval> | null = null;

    const run = async () => {
      try {
        await refreshOwner(true);
      } catch {
        // ignore initial error
      }

      idOwner = setInterval(() => {
        if (!alive) return;
        void refreshOwner(true);
      }, 20_000);
    };

    void run();

    return () => {
      alive = false;
      if (idOwner) clearInterval(idOwner);
    };
  }, [publicClient, refreshOwner]);

  return { owner, jarBalance, refreshOwner };
}
