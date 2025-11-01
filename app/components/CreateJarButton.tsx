"use client";

import { useState, useMemo } from "react";
import { ethers } from "ethers";
import { connectWallet, estimateAndCreateJar } from "../lib/web3Service";
import { BASE_SEPOLIA, TIPJAR_FACTORY_ADDRESS } from "../lib/constants";

export default function CreateJarButton() {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);

  const [maxGasPriceGwei, setMaxGasPriceGwei] = useState("0.1");   // Fuse B
  const [artistGasCapEth, setArtistGasCapEth] = useState("0.005"); // Fuse A

  const [feeInfo, setFeeInfo] = useState<{ maxFeePerGas?: string; maxPriorityFeePerGas?: string } | null>(null);
  const [estInfo, setEstInfo] = useState<{ gasLimit?: string; costEth?: string } | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [jarAddress, setJarAddress] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prettyChain = useMemo(
    () => `${BASE_SEPOLIA.chainName} (0x${BASE_SEPOLIA.chainIdDec.toString(16)})`,
    []
  );

  async function handleConnect() {
    setError(null);
    try {
      const { signer, address } = await connectWallet();
      setConnected(true);
      setAddress(address);

      const fd = await (signer.provider as ethers.Provider).getFeeData();
      setFeeInfo({
        maxFeePerGas: fd.maxFeePerGas ? formatGwei(fd.maxFeePerGas) : "—",
        maxPriorityFeePerGas: fd.maxPriorityFeePerGas ? formatGwei(fd.maxPriorityFeePerGas) : "—"
      });
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  }

  async function handleCreate() {
    setBusy(true);
    setError(null);
    setTxHash(null);
    setJarAddress(null);
    setEstInfo(null);
    try {
      const { signer } = await connectWallet();
      const res = await estimateAndCreateJar({ signer, maxGasPriceGwei, artistGasCapEth });
      setTxHash(res.txHash);
      setJarAddress(res.predictedJar ?? null);
      setEstInfo({ gasLimit: res.gasLimit, costEth: res.estimatedCostEth });
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-white/70">Сеть</div>
          <div className="font-medium">{prettyChain}</div>
        </div>
        {!connected ? (
          <button onClick={handleConnect} className="btn btn-primary">Подключить кошелёк</button>
        ) : (
          <div className="text-right">
            <div className="text-xs text-white/60">Подключен</div>
            <div className="text-sm font-mono truncate max-w-[240px]">{address}</div>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Предохранитель B (для фанатов): Max Gas Price (Gwei)</label>
          <input
            className="input"
            placeholder="например, 0.1"
            value={maxGasPriceGwei}
            onChange={(e) => setMaxGasPriceGwei(e.target.value)}
            inputMode="decimal"
          />
          <p className="mt-1 text-xs text-white/50">
            Передаётся в <span className="kbd">createJar(_maxGasPriceWei)</span>. Выше лимита — фанаты не смогут отправлять чаевые.
          </p>
        </div>

        <div>
          <label className="label">Предохранитель A (для артиста): Лимит стоимости tx (ETH)</label>
          <input
            className="input"
            placeholder="например, 0.005"
            value={artistGasCapEth}
            onChange={(e) => setArtistGasCapEth(e.target.value)}
            inputMode="decimal"
          />
          <p className="mt-1 text-xs text-white/50">
            Проверяем <span className="kbd">gasLimit × maxFeePerGas</span> перед отправкой. Если выше — отклоняем.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card">
          <div className="text-sm text-white/70 mb-2">Текущие комиссии</div>
          <div className="text-sm">
            <div>maxFeePerGas: <span className="font-mono">{feeInfo?.maxFeePerGas ?? "—"} Gwei</span></div>
            <div>maxPriorityFee: <span className="font-mono">{feeInfo?.maxPriorityFeePerGas ?? "—"} Gwei</span></div>
          </div>
          <p className="mt-2 text-xs text-white/50">Обновляется при подключении или создании Jar.</p>
        </div>

        <div className="card">
          <div className="text-sm text-white/70 mb-2">Оценка транзакции</div>
          <div className="text-sm">
            <div>gasLimit: <span className="font-mono">{estInfo?.gasLimit ?? "—"}</span></div>
            <div>Оценка: <span className="font-mono">{estInfo?.costEth ?? "—"} ETH</span></div>
          </div>
          <p className="mt-2 text-xs text-white/50">Считается в момент отправки с проверкой предохранителя A.</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-white/60">
          Фабрика: <span className="font-mono">{short(TIPJAR_FACTORY_ADDRESS)}</span>
        </div>
        <button onClick={handleCreate} className="btn btn-primary" disabled={busy} aria-busy={busy}>
          {busy ? "Создание..." : "Создать Tip Jar"}
        </button>
      </div>

      {txHash && (
        <div className="card">
          <div className="text-sm text-white/70 mb-1">Транзакция</div>
          <a className="text-baseBlue underline break-all" href={`https://sepolia.basescan.org/tx/${txHash}`} target="_blank" rel="noreferrer">
            {txHash}
          </a>
          {jarAddress && (
            <div className="mt-2 text-sm">
              Предполагаемый Jar:{" "}
              <a className="text-baseBlue underline break-all" href={`https://sepolia.basescan.org/address/${jarAddress}`} target="_blank" rel="noreferrer">
                {jarAddress}
              </a>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm">
          <div className="font-medium text-red-300 mb-1">Ошибка</div>
          <div className="whitespace-pre-wrap break-words text-red-200/90">{error}</div>
        </div>
      )}

      <div className="text-xs text-white/50">
        Подсказка: в некоторых кошельках удерживай <span className="kbd">Alt</span> при подтверждении, чтобы увидеть детали fee.
      </div>
    </div>
  );
}

function short(addr?: string | null) {
  if (!addr) return "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatGwei(n: bigint): string {
  return ethers.formatUnits(n, 9);
}
