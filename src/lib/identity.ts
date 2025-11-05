// src/lib/identity.ts
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';

const rpc =
  process.env.NEXT_PUBLIC_RPC_URL_ETH_MAINNET || 'https://eth.llamarpc.com';

const ensClient = createPublicClient({
  chain: mainnet,
  transport: http(rpc),
});

/** Возвращает primary name (.eth или .base) для адреса — либо null */
export async function getPrimaryName(address: `0x${string}`): Promise<string | null> {
  try {
    const name = await ensClient.getEnsName({ address });
    return name ?? null;
  } catch {
    return null;
  }
}

/** Возвращает URL аватара ENS/Basenames (если есть) — либо null */
export async function getAvatar(name: string): Promise<string | null> {
  try {
    const url = await ensClient.getEnsAvatar({ name });
    return url ?? null;
  } catch {
    return null;
  }
}
