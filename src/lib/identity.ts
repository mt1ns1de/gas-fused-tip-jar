// src/lib/identity.ts
import { createPublicClient, getAddress, http } from 'viem';
import { mainnet } from 'viem/chains';

const rpc =
  process.env.NEXT_PUBLIC_RPC_URL_ETH_MAINNET || 'https://eth.llamarpc.com';

const ensClient = createPublicClient({
  chain: mainnet,
  transport: http(rpc),
});

/* ──────────────── simple local cache ──────────────── */

const NAME_CACHE_KEY = 'gf_name_cache_v1';

type NameCache = Record<
  string,
  {
    name: string | null;
    ts: number;
  }
>;

function loadNameCache(): NameCache {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(NAME_CACHE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveNameCache(cache: NameCache) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(NAME_CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* ignore */
  }
}

/** Returns primary name (.eth or .base.eth) for address — or null */
export async function getPrimaryName(
  address: `0x${string}`,
): Promise<string | null> {
  const norm = getAddress(address).toLowerCase();
  const cache = loadNameCache();
  const cached = cache[norm];

  // 10 minutes TTL
  if (cached && Date.now() - cached.ts < 10 * 60_000) {
    return cached.name;
  }

  let result: string | null = null;

  try {
    const name = await ensClient.getEnsName({ address });
    if (name) {
      // Extra check: ensure this name actually resolves back to the address
      try {
        const resolved = await ensClient.getEnsAddress({ name });
        if (resolved && getAddress(resolved).toLowerCase() === norm) {
          result = name; // This can be ENS or a basename like tilmatochek.base.eth
        } else {
          result = null;
        }
      } catch {
        // If forward resolve fails, better to return null than an incorrect name
        result = null;
      }
    }
  } catch {
    result = null;
  }

  cache[norm] = { name: result, ts: Date.now() };
  saveNameCache(cache);

  return result;
}

/** Returns ENS/Basenames avatar URL (if exists) — or null */
export async function getAvatar(name: string): Promise<string | null> {
  try {
    const url = await ensClient.getEnsAvatar({ name });
    return url ?? null;
  } catch {
    return null;
  }
}