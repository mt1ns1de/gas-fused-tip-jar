"use client";

import { writeContract, waitForTransactionReceipt, switchChain } from "@wagmi/core";
import { getPublicClient } from "wagmi/actions";
import { base } from "viem/chains";
import { config } from "@/lib/wagmi";
import { TIPJAR_ABI } from "@/lib/abiTipJar";
import { type Hex } from "viem";

/** map raw provider/wallet errors → concise UX texts (EN) */
function mapError(e: unknown): string {
  const raw = String((e as any)?.shortMessage || (e as any)?.message || e || "");
  const msg = raw.toLowerCase();

  if (msg.includes("user rejected")) return "Signature was rejected in the wallet.";
  if (msg.includes("insufficient funds") || msg.includes("insufficient balance"))
    return "Insufficient balance to cover amount and fees.";
  if (msg.includes("wrong chain") || msg.includes("chain mismatch") || msg.includes("chain id"))
    return "Please switch your wallet to Base Mainnet (8453) and try again.";
  if (msg.includes("max fee") || msg.includes("priority fee"))
    return "Invalid gas settings. Please check max/priority fee.";
  if (msg.includes("timeout") || msg.includes("no backend is currently healthy"))
    return "Network provider is unstable. Please try again shortly.";

  return "Failed to send tip. Please try again.";
}

/**
 * Flexible adapter:
 *  sendTip({ jarAddress, message, valueWei })
 *  sendTip({ jar, message, value })
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
    // soft auto-switch to Base
    try {
      await switchChain(config, { chainId: base.id });
    } catch {
      /* ignore — proceed anyway, simulate will fail with clear text */
    }

    // simulate first for better error surfacing
    const publicClient = getPublicClient(config);
    const sim = await publicClient.simulateContract({
      address,
      abi: TIPJAR_ABI,
      functionName: "tip",
      args: [params.message ?? ""],
      value,
      chain: base,
      account: undefined,
    });

    const txHash = await writeContract(config, sim.request);
    await waitForTransactionReceipt(config, { hash: txHash as Hex });

    return {
      success: true,
      txHash: txHash as string,
      explorerUrl: `https://basescan.org/tx/${txHash}`,
    } as const;
  } catch (e: any) {
    return { success: false, error: mapError(e) } as const;
  }
}
