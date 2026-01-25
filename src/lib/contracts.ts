// src/lib/contracts.ts
import type { Address } from 'viem'
import { base, baseSepolia } from 'wagmi/chains'
import { env } from '@/config/env'

export const FACTORY_ADDRESSES: Record<number, Address | undefined> = {
  // Base Sepolia (Testnet)
  [baseSepolia.id]: '0x4432b13DABF32b67Bd41472e1350d7E083be6B01' as Address,

  // Base Mainnet (Production)
  // Logic: 1. Try fetching from config (env). 2. If empty — use hardcoded fallback.
  [base.id]: (env.FACTORY_BASE_MAINNET || '0x7CdA207B39F7648AABD5DF98c50f9AeA5f861e38') as Address, 
}

// CORRECT ABI (matches your TipJarFactory.sol without proxy)
export const FACTORY_ABI = [
  {
    type: 'function',
    name: 'createJar',
    inputs: [
      { name: '_maxGasPriceWei', type: 'uint256', internalType: 'uint256' }
    ],
    outputs: [
      { name: 'jar', type: 'address', internalType: 'address' }
    ],
    stateMutability: 'nonpayable'
  },
  {
    type: 'event',
    name: 'JarCreated',
    inputs: [
      { name: 'owner', type: 'address', indexed: true, internalType: 'address' },
      { name: 'jar', type: 'address', indexed: false, internalType: 'address' }
    ],
    anonymous: false
  }
] as const