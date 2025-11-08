import type { PublicClient } from 'viem';
import { parseGwei } from 'viem';

/** Get safe gas price with fallback when RPC returns 0n or fails. */
export async function getSafeGasPrice(client: PublicClient): Promise<{
  wei: bigint;
  fallbackUsed: boolean;
}> {
  try {
    const v = await client.getGasPrice();
    if (v && v > 0n) return { wei: v, fallbackUsed: false };
    // fallback if provider returned 0
    const fb = parseGwei('1.5'); // 1.5 gwei conservative default for Base
    return { wei: fb, fallbackUsed: true };
  } catch {
    // fallback on error/rate limit
    const fb = parseGwei('1.5');
    return { wei: fb, fallbackUsed: true };
  }
}

/** helpers */
export function gweiFromWei(wei: bigint): number {
  // simple conversion for UI
  return Number(wei) / 1e9;
}
