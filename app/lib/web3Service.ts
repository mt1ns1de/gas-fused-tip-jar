"use client";

import { BrowserProvider, Contract, ethers, Interface } from "ethers";
import {
  BASE_SEPOLIA,
  TIPJAR_FACTORY_ABI,
  TIPJAR_FACTORY_ADDRESS
} from "./constants";

/** Подключение кошелька и форс-переключение на Base Sepolia (84532) */
export async function connectWallet() {
  const eth = (globalThis as any).ethereum;
  if (!eth) throw new Error("Кошелёк не найден. Установи MetaMask / Rabby и обнови страницу.");

  const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
  const address = accounts[0];

  const current = await eth.request({ method: "eth_chainId" });
  if (current !== BASE_SEPOLIA.chainIdHex) {
    try {
      await eth.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: BASE_SEPOLIA.chainIdHex }]
      });
    } catch (err: any) {
      if (err?.code === 4902 || /not added/i.test(String(err?.message))) {
        await eth.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: BASE_SEPOLIA.chainIdHex,
            chainName: BASE_SEPOLIA.chainName,
            rpcUrls: [BASE_SEPOLIA.rpcUrl],
            nativeCurrency: BASE_SEPOLIA.nativeCurrency,
            blockExplorerUrls: BASE_SEPOLIA.blockExplorerUrls
          }]
        });
      } else {
        throw err;
      }
    }
  }

  const provider = new BrowserProvider(eth);
  const signer = await provider.getSigner();
  return { provider, signer, address };
}

/** Оценка и создание Jar с двумя предохранителями */
export async function estimateAndCreateJar(params: {
  signer: ethers.Signer;
  maxGasPriceGwei: string;   // Fuse B (для фанатов)
  artistGasCapEth: string;   // Fuse A (жёсткий лимит артиста на стоимость tx)
}) {
  const { signer, maxGasPriceGwei, artistGasCapEth } = params;

  const factory = new Contract(TIPJAR_FACTORY_ADDRESS, TIPJAR_FACTORY_ABI, signer);

  const maxGasPriceWei = gweiToWei(maxGasPriceGwei);
  const artistCapWei = ethers.parseEther(artistGasCapEth || "0");

  const provider = signer.provider as ethers.Provider;
  const feeData = await provider.getFeeData();
  if (!feeData.maxFeePerGas) throw new Error("Невозможно получить maxFeePerGas от провайдера.");

  const maxFeePerGas = feeData.maxFeePerGas;
  const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas ?? 0n;

  const gasLimit = await factory.estimateGas.createJar(maxGasPriceWei);

  const estimatedCostWei = gasLimit * maxFeePerGas;
  if (estimatedCostWei > artistCapWei) {
    throw new Error(
      `Предохранитель A: расчетная стоимость ${ethers.formatEther(estimatedCostWei)} ETH ` +
      `превышает лимит ${ethers.formatEther(artistCapWei)} ETH.`
    );
  }

  let predictedJar: string | null = null;
  try {
    predictedJar = await factory.createJar.staticCall(maxGasPriceWei);
  } catch { predictedJar = null; }

  const tx = await factory.createJar(maxGasPriceWei, {
    maxFeePerGas,
    maxPriorityFeePerGas,
    gasLimit
  });
  const receipt = await tx.wait();

  let jarFromEvent: string | null = null;
  try {
    const iface = new Interface(TIPJAR_FACTORY_ABI);
    for (const log of (receipt?.logs ?? [])) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "JarCreated") {
          jarFromEvent = parsed.args?.jarAddress as string;
          break;
        }
      } catch {}
    }
  } catch {}

  return {
    txHash: receipt?.hash ?? tx.hash,
    gasLimit: gasLimit.toString(),
    maxFeePerGas: maxFeePerGas.toString(),
    maxPriorityFeePerGas: maxPriorityFeePerGas.toString(),
    estimatedCostWei: estimatedCostWei.toString(),
    estimatedCostEth: ethers.formatEther(estimatedCostWei),
    predictedJar: predictedJar ?? jarFromEvent ?? null
  };
}

function gweiToWei(inputGwei: string): bigint {
  return ethers.parseUnits(inputGwei || "0", 9);
}
