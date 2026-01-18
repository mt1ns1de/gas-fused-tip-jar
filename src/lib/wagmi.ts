// src/lib/wagmi.ts
import { createConfig, http } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { injected, coinbaseWallet } from 'wagmi/connectors';
import { fallback } from 'viem';
import { env } from '@/config/env';

// RPC endpoints come from env; we keep one primary and an optional fallback for Base mainnet.
const rpcBasePrimary = env.RPC_URL_BASE;
const rpcBaseFallback = env.RPC_URL_BASE_FALLBACK;
const rpcSepolia = env.RPC_URL_BASE_SEPOLIA;

export const config = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    injected({ shimDisconnect: true }),
    coinbaseWallet({
      appName: env.APP_NAME,
    }),
  ],
  transports: {
    [base.id]: rpcBaseFallback
      ? fallback([http(rpcBasePrimary), http(rpcBaseFallback)])
      : http(rpcBasePrimary),
    [baseSepolia.id]: http(rpcSepolia),
  },
  multiInjectedProviderDiscovery: true,
});
