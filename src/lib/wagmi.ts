// src/lib/wagmi.ts
import { createConfig, http } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { injected, coinbaseWallet } from 'wagmi/connectors';
import { fallback } from 'viem';

// RPC из .env (сохраняю твою идею с fallback для mainnet)
const rpcBasePrimary = process.env.NEXT_PUBLIC_RPC_URL_BASE || 'https://mainnet.base.org';
const rpcBaseFallback = process.env.NEXT_PUBLIC_RPC_URL_BASE_FALLBACK || '';
const rpcSepolia = process.env.NEXT_PUBLIC_RPC_URL_BASE_SEPOLIA || 'https://sepolia.base.org';

export const config = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    injected({ shimDisconnect: true }),
    coinbaseWallet({
      appName: process.env.NEXT_PUBLIC_APP_NAME || 'Gas-Fused Tip Jar',
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
