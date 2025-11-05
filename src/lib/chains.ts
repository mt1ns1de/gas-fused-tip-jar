// src/lib/chains.ts
import { base, baseSepolia } from "viem/chains";

export type SupportedChain = typeof base | typeof baseSepolia;

export function getActiveChain(): SupportedChain {
  const env = process.env.NEXT_PUBLIC_NETWORK ?? "base-sepolia";
  return env === "base" ? base : baseSepolia;
}

export function getExplorerBaseUrl() {
  const chain = getActiveChain();
  return chain.id === base.id
    ? "https://basescan.org"
    : "https://sepolia.basescan.org";
}

export function getFactoryAddress(): `0x${string}` {
  const chain = getActiveChain();
  if (chain.id === base.id) {
    return process.env
      .NEXT_PUBLIC_FACTORY_BASE_MAINNET as `0x${string}`;
  }
  return process.env
    .NEXT_PUBLIC_FACTORY_BASE_SEPOLIA as `0x${string}`;
}
