// src/lib/contracts.ts
import type { Address } from 'viem'
import { base, baseSepolia } from 'wagmi/chains'
import { env } from '@/config/env'

export const FACTORY_ADDRESSES: Record<number, Address | undefined> = {
  // Base Sepolia (Testnet)
  [baseSepolia.id]: '0x4432b13DABF32b67Bd41472e1350d7E083be6B01' as Address,

  // Base Mainnet (Production)
  // Логика: 1. Пробуем взять из конфига (env). 2. Если там пусто — используем хардкод.
  [base.id]: (env.FACTORY_BASE_MAINNET || '0x7CdA207B39F7648AABD5DF98c50f9AeA5f861e38') as Address, 
}

// ABI Фабрики (экспортируем его отсюда, чтобы использовать везде)
export const FACTORY_ABI = [
  { inputs:[{internalType:'address',name:'_initialLogic',type:'address'},{internalType:'address',name:'_initialOwner',type:'address'}],stateMutability:'nonpayable',type:'constructor' },
  { inputs:[], name:'FailedDeployment', type:'error' },
  { inputs:[], name:'InitializationFailed', type:'error' },
  { inputs:[{internalType:'uint256',name:'balance',type:'uint256'},{internalType:'uint256',name:'needed',type:'uint256'}], name:'InsufficientBalance', type:'error' },
  { inputs:[], name:'InvalidImplementation', type:'error' },
  { inputs:[{internalType:'address',name:'owner',type:'address'}], name:'OwnableInvalidOwner', type:'error' },
  { inputs:[{internalType:'address',name:'account',type:'address'}], name:'OwnableUnauthorizedAccount', type:'error' },
  { anonymous:false, inputs:[{indexed:false,internalType:'address',name:'newImplementation',type:'address'}], name:'ImplementationUpdated', type:'event' },
  { anonymous:false, inputs:[{indexed:true,internalType:'address',name:'recipient',type:'address'},{indexed:false,internalType:'address',name:'jarAddress',type:'address'},{indexed:false,internalType:'uint256',name:'maxGasPriceWei',type:'uint256'}], name:'JarCreated', type:'event' },
  { anonymous:false, inputs:[{indexed:true,internalType:'address',name:'previousOwner',type:'address'},{indexed:true,internalType:'address',name:'newOwner',type:'address'}], name:'OwnershipTransferred', type:'event' },
  { inputs:[{internalType:'uint256',name:'_maxGasPriceWei',type:'uint256'}], name:'createJar', outputs:[{internalType:'address payable',name:'jarAddress',type:'address'}], stateMutability:'nonpayable', type:'function' },
  { inputs:[], name:'logicImplementation', outputs:[{internalType:'address',name:'',type:'address'}], stateMutability:'view', type:'function' },
  { inputs:[], name:'owner', outputs:[{internalType:'address',name:'',type:'address'}], stateMutability:'view', type:'function' },
  { inputs:[], name:'renounceOwnership', outputs:[], stateMutability:'nonpayable', type:'function' },
  { inputs:[{internalType:'address',name:'newOwner',type:'address'}], name:'transferOwnership', outputs:[], stateMutability:'nonpayable', type:'function' },
  { inputs:[{internalType:'address',name:'_newLogic',type:'address'}], name:'updateImplementation', outputs:[], stateMutability:'nonpayable', type:'function' },
] as const