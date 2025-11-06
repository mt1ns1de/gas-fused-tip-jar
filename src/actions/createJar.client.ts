'use client';

import { writeContract, waitForTransactionReceipt } from '@wagmi/core';
import { decodeEventLog, type Hex } from 'viem';
import { base } from 'viem/chains';
import { switchChain, getChainId } from 'wagmi/actions';
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

async function ensureBase(): Promise<boolean> {
  try {
    if (getChainId(config) === base.id) return true;
  } catch { /* ignore */ }
  try {
    await switchChain(config, { chainId: base.id });
    return true;
  } catch {
    return false;
  }
}

/** Создание банки через фабрику */
export async function createJar(params: { maxGasPriceWei: bigint }) {
  try {
    if (!FACTORY_ADDRESS || !FACTORY_ABI?.length) {
      return { success: false, error: 'Factory config is missing' } as const;
    }

    // 🔒 Гарантируем сеть Base непосредственно перед транзакцией
    const ok = await ensureBase();
    if (!ok) {
      return {
        success: false,
        error: 'Please switch your wallet to Base Mainnet (8453) and try again.',
      } as const;
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
        const topics =
          (log.topics && log.topics.length > 0
            ? ([log.topics[0] as `0x${string}`, ...(log.topics.slice(1) as `0x${string}`[])] as
                [] | [`0x${string}`, ...`0x${string}`[]])
            : ([] as []));

        const data = ((log as any).data ?? '0x') as `0x${string}`;

        const parsed = decodeEventLog({
          abi: FACTORY_ABI,
          data,
          topics,
        }) as { eventName: string; args: any };

        if (parsed.eventName === 'JarCreated') {
          const args = parsed.args || {};
          if (args.jar) {
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

    // Тоже на всякий случай — на Base
    await ensureBase();

    const txHash = await writeContract(config, {
      abi: TIPJAR_ABI as any,
      address: jarAddress,
      functionName: 'withdraw',
      args: [] as const,
      chainId: BASE_MAINNET_ID,
    });

    await waitForTransactionReceipt(config, { hash: txHash });
    return { success: true, txHash } as const;
  } catch (e: any) {
    return { success: false, error: e?.message ?? 'Unknown error' } as const;
  }
}
