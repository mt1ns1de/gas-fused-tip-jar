"use client";

import { writeContract, waitForTransactionReceipt, switchChain } from "@wagmi/core";
import { base } from "viem/chains";
import { config } from "@/lib/wagmi";
import { TIPJAR_ABI } from "@/lib/abiTipJar";
import { type Hex } from "viem";

/**
 * Универсальный сигнатурный адаптер.
 * Можно вызывать так:
 *  sendTip({ jarAddress, message, valueWei })
 *  sendTip({ jar, message, value })
 * Любое из address/value можно нести под альтернативным ключом.
 */
export async function sendTip(params: {
  jarAddress?: `0x${string}`;
  jar?: `0x${string}`;
  valueWei?: bigint;
  value?: bigint;
  message: string;
}) {
  const address = (params.jarAddress ?? params.jar) as `0x${string}` | undefined;
  const value = (params.valueWei ?? params.value) as bigint | undefined;

  if (!address) return { success: false, error: "Jar address is missing" } as const;
  if (!value || value <= 0n) return { success: false, error: "Invalid tip amount" } as const;

  try {
    // мягкий автосвитч на Base
    try {
      await switchChain(config, { chainId: base.id });
    } catch {
      /* ignore — попробуем всё равно */
    }

    const txHash = await writeContract(config, {
      address,
      abi: TIPJAR_ABI,
      functionName: "tip",
      args: [params.message ?? ""],
      value,
      chainId: 8453 as const,
    });

    const receipt = await waitForTransactionReceipt(config, { hash: txHash as Hex });
    return {
      success: true,
      txHash: txHash as string,
      explorerUrl: `https://basescan.org/tx/${txHash}`,
    } as const;
  } catch (e: any) {
    return { success: false, error: e?.shortMessage || e?.message || "Failed to send tip" } as const;
  }
}
