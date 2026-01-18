// src/config/env.ts
// Centralized access to environment variables used in the app.
// Keep this file tiny and framework-agnostic.

export const env = {
  NETWORK:
    process.env.NEXT_PUBLIC_NETWORK === 'baseSepolia' ? 'baseSepolia' : 'base',

  FACTORY_BASE_MAINNET: process.env.NEXT_PUBLIC_FACTORY_BASE_MAINNET || '',

  FACTORY_ABI_JSON: process.env.NEXT_PUBLIC_FACTORY_ABI || '[]',

  RPC_URL_BASE:
    process.env.NEXT_PUBLIC_RPC_URL_BASE || 'https://mainnet.base.org',

  RPC_URL_BASE_FALLBACK:
    process.env.NEXT_PUBLIC_RPC_URL_BASE_FALLBACK || '',

  RPC_URL_BASE_SEPOLIA:
    process.env.NEXT_PUBLIC_RPC_URL_BASE_SEPOLIA || 'https://sepolia.base.org',

  APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'Gas-Fused Tip Jar',

  ETHERSCAN_API_KEY: process.env.ETHERSCAN_API_KEY || '',
} as const;
