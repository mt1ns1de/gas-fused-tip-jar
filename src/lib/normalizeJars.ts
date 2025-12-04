// src/lib/normalizeJars.ts

export type JarRow = {
  jar: `0x${string}`;
  blockNumber: string;
  txHash: string;
  chainId?: number | null;
};

export const ACTIVE_CHAIN_ID =
  process.env.NEXT_PUBLIC_NETWORK === 'baseSepolia' ? 84532 : 8453;

/**
 * 1) фильтр по активной сети (если chainId есть),
 * 2) дедуп по jar (оставляем запись с максимальным blockNumber),
 * 3) сортировка по blockNumber по убыванию.
 */
export function normalizeJars(rows: JarRow[]): JarRow[] {
  if (!rows?.length) return [];

  const chainFiltered = rows.filter((r) => {
    if (r.chainId == null) return true;
    return r.chainId === ACTIVE_CHAIN_ID;
  });

  const byJar = new Map<string, JarRow>();

  for (const r of chainFiltered) {
    const existing = byJar.get(r.jar);
    if (!existing) {
      byJar.set(r.jar, r);
    } else {
      try {
        const cur = BigInt(existing.blockNumber);
        const next = BigInt(r.blockNumber);
        if (next > cur) byJar.set(r.jar, r);
      } catch {
        // ignore parse errors
      }
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
