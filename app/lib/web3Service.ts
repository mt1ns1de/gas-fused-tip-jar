"use client";

import { BrowserProvider, Contract, ethers, Interface } from "ethers";
import {
  BASE_SEPOLIA,
  TIPJAR_FACTORY_ABI,
  TIPJAR_FACTORY_ADDRESS
} from "./constants";
import {
  ProviderId,
  InjectedDescriptor,
  getProviderById,
  selectDefaultProvider
} from "./walletProviders";

type Preferred = ProviderId | "auto";

/** Форсим/добавляем Base Sepolia на выбранном провайдере */
async function ensureBaseSepolia(eth: any) {
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
          params: [
            {
              chainId: BASE_SEPOLIA.chainIdHex,
              chainName: BASE_SEPOLIA.chainName,
              rpcUrls: [BASE_SEPOLIA.rpcUrl],
              nativeCurrency: BASE_SEPOLIA.nativeCurrency,
              blockExplorerUrls: BASE_SEPOLIA.blockExplorerUrls
            }
          ]
        });
      } else {
        throw err;
      }
    }
  }
}

/**
 * Подключение кошелька.
 * preferred:
 *  - "auto": если один провайдер — используем его; если несколько — выберешь во внешнем коде и передашь injected.
 *  - "rabby" | "metamask": принудительный выбор по id.
 * injected: если уже выбрал в модалке — передай сюда объект провайдера.
 */
export async function connectWallet(params?: {
  preferred?: Preferred;
  injected?: InjectedDescriptor | null;
}) {
  const preferred = params?.preferred ?? "auto";
  let chosen: InjectedDescriptor | null = params?.injected ?? null;

  if (!chosen) {
    if (preferred === "auto") {
      const list = selectDefaultProvider();
      if (list.length === 0) {
        throw new Error(
          "Кошелёк не найден. Установи Rabby или MetaMask и перезагрузи страницу."
        );
      }
      if (list.length === 1) {
        chosen = list[0];
      } else {
        // оставляем выбор модалке — бросаем осмысленную ошибку
        const labels = list.map((d) => d.label).join(", ");
        throw new Error(`Найдено несколько провайдеров: ${labels}. Выбери в модалке.`);
      }
    } else {
      const pick = getProviderById(preferred as ProviderId);
      if (!pick) {
        throw new Error(
          preferred === "rabby"
            ? "Rabby не обнаружен в браузере."
            : "MetaMask не обнаружен в браузере."
        );
      }
      chosen = pick;
    }
  }

  const eth = chosen.provider;
  const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
  const address = accounts[0];

  await ensureBaseSepolia(eth);

  const provider = new BrowserProvider(eth);
  const signer = await provider.getSigner();

  return {
    provider,
    signer,
    address,
    wallet: { id: chosen.id, label: chosen.label }
  };
}

/** Оценка и создание Jar с двумя предохранителями */
export async function estimateAndCreateJar(params: {
  signer: ethers.Signer;
  maxGasPriceGwei: string; // Fuse B (для фанатов)
  artistGasCapEth: string; // Fuse A (жёсткий лимит артиста на стоимость tx)
}) {
  const { signer, maxGasPriceGwei, artistGasCapEth } = params;

  const factory = new Contract(
    TIPJAR_FACTORY_ADDRESS,
    TIPJAR_FACTORY_ABI,
    signer
  );

  const maxGasPriceWei = gweiToWei(maxGasPriceGwei);
  const artistCapWei = ethers.parseEther(artistGasCapEth || "0");

  const provider = signer.provider as ethers.Provider;
  const feeData = await provider.getFeeData();
  if (!feeData.maxFeePerGas)
    throw new Error("Невозможно получить maxFeePerGas от провайдера.");

  const maxFeePerGas = feeData.maxFeePerGas;
  const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas ?? 0n;

  const gasLimit = await factory.estimateGas.createJar(maxGasPriceWei);
  const estimatedCostWei = gasLimit * maxFeePerGas;

  if (estimatedCostWei > artistCapWei) {
    throw new Error(
      `Предохранитель A: расчётная стоимость ${ethers.formatEther(
        estimatedCostWei
      )} ETH выше лимита ${ethers.formatEther(artistCapWei)} ETH.`
    );
  }

  let predictedJar: string | null = null;
  try {
    predictedJar = await factory.createJar.staticCall(maxGasPriceWei);
  } catch {
    predictedJar = null;
  }

  const tx = await factory.createJar(maxGasPriceWei, {
    maxFeePerGas,
    maxPriorityFeePerGas,
    gasLimit
  });
  const receipt = await tx.wait();

  let jarFromEvent: string | null = null;
  try {
    const iface = new Interface(TIPJAR_FACTORY_ABI);
    for (const log of receipt?.logs ?? []) {
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
