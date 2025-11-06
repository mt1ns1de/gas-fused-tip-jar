'use client';

import { writeContract, waitForTransactionReceipt } from '@wagmi/core';
import { decodeEventLog, type Hex } from 'viem';
import { base } from 'viem/chains';
import { getAccount, switchChain } from 'wagmi/actions';
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

async function ensureBaseOrFail(): Promise<{ address: `0x${string}` }> {
  const acc0 = getAccount(config);
  if (acc0.status !== 'connected' || !acc0.address) {
    throw new Error('Connect your wallet first.');
  }
  if (acc0.chainId !== base.id) {
    await switchChain(config, { chainId: base.id });
    // подождём фактического переключения (кошелёк может лагать)
    for (let i = 0; i < 6; i++) {
      await new Promise((r) => setTimeout(r, 250));
      const acc = getAccount(config);
      if (acc.chainId === base.id) {
        return { address: acc.address as `0x${string}` };
      }
    }
    throw new Error('Please switch your wallet to Base Mainnet (8453) and try again.');
  }
  return { address: acc0.address as `0x${string}` };
}

/** Создание банки через фабрику */
export async function createJar(params: { maxGasPriceWei: bigint }) {
  try {
    if (!FACTORY_ADDRESS || !FACTORY_ABI?.length) {
      return { success: false, error: 'Factory config is missing' } as const;
    }

    const { address: account } = await ensureBaseOrFail();

    const attempt = async () =>
      writeContract(config, {
        abi: FACTORY_ABI,
        address: FACTORY_ADDRESS,
        functionName: 'createJar',
        args: [params.maxGasPriceWei],
        account,
        chainId: base.id, // 🔒 явно указываем целевую сеть
      });

    let hash: Hex;
    try {
      hash = (await attempt()) as Hex;
    } catch (e: any) {
      const msg = String(e?.message || '');
      // если вдруг кошелёк вернул mismatch — пробуем ещё раз после повторного ensure
      if (/ChainMismatch|does not match the target chain/i.test(msg)) {
        await ensureBaseOrFail();
        hash = (await attempt()) as Hex;
      } else {
        throw e;
      }
    }

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

    const { address: account } = await ensureBaseOrFail();

    const txHash = await writeContract(config, {
      abi: TIPJAR_ABI as any,
      address: jarAddress,
      functionName: 'withdraw',
      args: [] as const,
      account,
      chainId: base.id,
    });

    await waitForTransactionReceipt(config, { hash: txHash });
    return { success: true, txHash } as const;
  } catch (e: any) {
    return { success: false, error: e?.message ?? 'Unknown error' } as const;
  }
}
