'use client';

import { writeContract, waitForTransactionReceipt } from '@wagmi/core';
import { decodeEventLog, type Hex } from 'viem';
import { config } from '@/lib/wagmi';

// ABI фабрики из .env.local (одна строка JSON)
const FACTORY_ABI: any = (() => {
  try {
    return JSON.parse(process.env.NEXT_PUBLIC_FACTORY_ABI ?? '[]');
  } catch {
    return [];
  }
})();

const FACTORY_ADDRESS = process.env
  .NEXT_PUBLIC_FACTORY_BASE_MAINNET as `0x${string}`;

const BASE_MAINNET_ID = 8453 as const;

/** Создание банки через фабрику */
export async function createJar(params: { maxGasPriceWei: bigint }) {
  try {
    if (!FACTORY_ADDRESS || !FACTORY_ABI?.length) {
      return { success: false, error: 'Factory config is missing' } as const;
    }

    const hash = await writeContract(config, {
      abi: FACTORY_ABI,
      address: FACTORY_ADDRESS,
      functionName: 'createJar',
      args: [params.maxGasPriceWei],
      chainId: BASE_MAINNET_ID,
    });

    const receipt = await waitForTransactionReceipt(config, { hash });

    // Парсим событие JarCreated
    let jar: `0x${string}` | undefined;
    for (const log of receipt.logs) {
      try {
        const parsed = decodeEventLog({
          abi: FACTORY_ABI as any,
          data: log.data as Hex,
          topics: log.topics as readonly Hex[],
        });
        if (parsed?.eventName === 'JarCreated') {
          const args: any = parsed.args;
          if (args?.jar) {
            jar = args.jar as `0x${string}`;
            break;
          }
        }
      } catch {
        // не наше событие — пропускаем
      }
    }

    return { success: true, txHash: receipt.transactionHash, jarAddress: jar } as const;
  } catch (e: any) {
    return { success: false, error: e?.message ?? 'Unknown error' } as const;
  }
}

/** Вывод средств из конкретной банки */
export async function withdrawFromJar(jarAddress: `0x${string}`) {
  try {
    const TIPJAR_ABI = [
      { type: 'function', name: 'withdraw', inputs: [], outputs: [], stateMutability: 'nonpayable' },
    ] as const;

    const txHash = await writeContract(config, {
      abi: TIPJAR_ABI as any,
      address: jarAddress,
      functionName: 'withdraw',
      args: [],
      chainId: BASE_MAINNET_ID,
    });

    await waitForTransactionReceipt(config, { hash: txHash });
    return { success: true, txHash } as const;
  } catch (e: any) {
    return { success: false, error: e?.message ?? 'Unknown error' } as const;
  }
}
