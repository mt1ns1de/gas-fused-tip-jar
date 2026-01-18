// src/lib/normalizeJars.ts

import { env } from '@/config/env';

export type JarRow = {
  jar: `0x${string}`;
  blockNumber: string;
  txHash: string;
  chainId?: number | null;
};

// Active chain id as seen by the app; we infer it from NEXT_PUBLIC_NETWORK.
export const ACTIVE_CHAIN_ID =
  env.NETWORK === 'baseSepolia' ? 84532 : 8453;

/**
 * Normalizes raw jar rows:
 *  1) filter by ACTIVE_CHAIN_ID (if chainId is present),
 *  2) deduplicate by jar (keep the row with the largest blockNumber),
 *  3) sort by blockNumber descending.
 */
export function normalizeJars(rows: JarRow[]): JarRow[] {
  if (!rows?.length) return [];

  const byJar = new Map<string, JarRow>();

  for (const row of rows) {
    if (!row.jar) continue;
    if (row.chainId && row.chainId !== ACTIVE_CHAIN_ID) continue;

    const key = row.jar.toLowerCase();
    const existing = byJar.get(key);
    if (!existing) {
      byJar.set(key, row);
      continue;
    }

    try {
      const prev = BigInt(existing.blockNumber);
      const next = BigInt(row.blockNumber);
      if (next > prev) {
        byJar.set(key, row);
      }
    } catch {
      // If blockNumber is not parseable, keep the existing one.
    }
  }

  return [...byJar.values()].sort((a, b) => {
    try {
      const ab = BigInt(a.blockNumber);
      const bb = BigInt(b.blockNumber);
      if (bb > ab) return 1;
      if (bb < ab) return -1;
      return 0;
    } catch {
      return 0;
    }
  });
}
