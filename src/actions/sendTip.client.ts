"use client";

import { writeContract, waitForTransactionReceipt, switchChain } from "@wagmi/core";
import { getPublicClient } from "wagmi/actions";
import { base } from "viem/chains";
import { config } from "@/lib/wagmi";
import { TIPJAR_ABI } from "@/lib/abiTipJar";
import { type Hex } from "viem";

/** маппер ошибок → понятные тексты */
function mapError(e: unknown): string {
  const raw = String((e as any)?.shortMessage || (e as any)?.message || e || "");
  const msg = raw.toLowerCase();

  if (msg.includes("user rejected")) return "Подпись отклонена в кошельке.";
  if (msg.includes("insufficient funds") || msg.includes("insufficient balance"))
    return "Недостаточно средств для суммы и комиссии.";
  if (msg.includes("wrong chain") || msg.includes("chain mismatch") || msg.includes("chain id"))
    return "Переключитесь на Base Mainnet (8453) и повторите.";
  if (msg.includes("max fee") || msg.includes("priority fee"))
    return "Некорректная комиссия. Проверьте настройки газа.";
  if (msg.includes("timeout") || msg.includes("no backend is currently healthy"))
    return "Провайдер сети нестабилен. Попробуйте чуть позже.";

  return "Не удалось отправить чаевые. Попробуйте ещё раз.";
}

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

    // ✅ симуляция перед сабмитом — заранее ловим большинство ошибок
    const publicClient = getPublicClient(config);
    const sim = await publicClient.simulateContract({
      address,
      abi: TIPJAR_ABI,
      functionName: "tip",
      args: [params.message ?? ""],
      value,
      chainId: base.id,
      account: undefined,
    });

    // сабмитим exactly то, что вернула симуляция
    const txHash = await writeContract(config, sim.request);
    const receipt = await waitForTransactionReceipt(config, { hash: txHash as Hex });

    return {
      success: true,
      txHash: txHash as string,
      explorerUrl: `https://basescan.org/tx/${txHash}`,
    } as const;
  } catch (e: any) {
    return { success: false, error: mapError(e) } as const;
  }
}
