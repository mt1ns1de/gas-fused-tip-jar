'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAccount, useChainId, usePublicClient } from 'wagmi';
import { isAddress } from 'viem';
import WalletButton from '@/components/WalletButton';
import CursorAura from '@/components/CursorAura';
import CreateJar from '@/components/CreateJar';
import { TIPJAR_ABI } from '@/lib/abiTipJar';
import { useRouter } from 'next/navigation';
import Slogan from '@/components/Slogan';

function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

export default function Page() {
  const mounted = useMounted();
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const router = useRouter();
  const publicClient = usePublicClient();

  // last created jar (локалсторадж)
  const [lastJar, setLastJar] = useState<string | null>(null);

  // адрес для открытия
  const [openInput, setOpenInput] = useState('');

  // состояние валидации адреса / контракта
  const [validating, setValidating] = useState(false);
  const [isValidJar, setIsValidJar] = useState<boolean | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);

  // загрузка lastJar после маунта
  useEffect(() => {
    if (!mounted) return;
    try {
      const v = localStorage.getItem('lastJarAddress');
      if (v) setLastJar(v);
    } catch {}
  }, [mounted]);

  // валидация формата адреса
  const isAddrFormatOk = useMemo(() => {
    const v = openInput.trim();
    return isAddress(v);
  }, [openInput]);

  // дебаунс-проверка, что это именно TipJar (а не EOA/любой контракт)
  useEffect(() => {
    let alive = true;
    const v = openInput.trim();

    // сбрасываем состояния при пустом/невалидном формате
    if (!v || !isAddrFormatOk) {
      setIsValidJar(null);
      setOpenError(null);
      setValidating(false);
      return;
    }

    const t = setTimeout(async () => {
      if (!publicClient) return;
      setValidating(true);
      setOpenError(null);
      try {
        // Пробуем прочитать maxGasPriceWei() — у чужого ABI/EOA упадёт
        await publicClient.readContract({
          address: v as `0x${string}`,
          abi: TIPJAR_ABI as any,
          functionName: 'maxGasPriceWei',
          args: [] as const,
        });
        if (!alive) return;
        setIsValidJar(true);
      } catch {
        if (!alive) return;
        setIsValidJar(false);
        setOpenError('This address is not a TipJar contract on Base.');
      } finally {
        if (alive) setValidating(false);
      }
    }, 250); // лёгкий debounce

    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [openInput, publicClient, isAddrFormatOk]);

  // при успешном создании — запомнить адрес
  const onJarCreated = (addr: string) => {
    try {
      localStorage.setItem('lastJarAddress', addr);
    } catch {}
    setLastJar(addr);
  };

  // можно открывать, если формат ок и проверка прошла как TipJar
  const canOpen = isAddrFormatOk && isValidJar === true && !validating;

  const handleOpen = () => {
    if (!canOpen) return;
    const a = openInput.trim();
    router.push(`/jar/${a}`);
  };

  return (
    <main className="relative z-0 min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <CursorAura />

      {/* ЦЕНТРАЛЬНАЯ КОЛОНКА (как на странице доната) */}
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-8 flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold">Gas-Fused Tip Jar</h1>
            {mounted && (
              <p className="text-sm text-neutral-400">
                Network: {chainId ?? '—'} (Base Mainnet)
                <br />
                Factory:{' '}
                <a
                  className="text-[#7ab4ff] underline"
                  href={`https://basescan.org/address/${process.env.NEXT_PUBLIC_FACTORY_BASE_MAINNET}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {process.env.NEXT_PUBLIC_FACTORY_BASE_MAINNET}
                </a>
              </p>
            )}
          </div>
          <WalletButton />
        </header>

        {/* Create Jar — рендерим только после маунта, чтобы не было гидрации с isConnected */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
          <h2 className="mb-4 text-xl font-semibold text-center">Create Jar</h2>
          {mounted && <CreateJar onCreated={onJarCreated} />}
        </section>

        {/* Open a Jar (вертикальный стек + кнопка по центру) */}
        <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
          <h3 className="mb-3 text-lg font-semibold text-center">Open a Jar</h3>

          <input
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 outline-none ring-0 focus:border-[#2563eb]"
            placeholder="Paste jar address 0x…"
            value={openInput}
            onChange={(e) => setOpenInput(e.target.value)}
          />

          {/* Подсказки по статусам */}
          <div className="mt-2 min-h-[1.5rem] text-sm text-center">
            {!openInput ? (
              <p className="text-neutral-400">
                Enter a specific jar address to open its public page (direct access).
              </p>
            ) : !isAddrFormatOk ? (
              <p className="text-red-300">Invalid address format.</p>
            ) : validating ? (
              <p className="text-neutral-400">Validating address on-chain…</p>
            ) : isValidJar === false ? (
              <p className="text-red-300">{openError}</p>
            ) : isValidJar === true ? (
              <p className="text-emerald-300">Looks good — this is a TipJar. You can open it.</p>
            ) : null}
          </div>

          <div className="mt-3 flex justify-center">
            <button
              onClick={handleOpen}
              disabled={!canOpen}
              className="rounded-xl bg-[#0052FF] px-5 py-2.5 font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50 hover:opacity-90 active:opacity-80"
            >
              {validating ? 'Validating…' : 'Open'}
            </button>
          </div>

          {mounted && lastJar && (
            <p className="mt-3 text-center text-xs text-neutral-500">
              Last created:{' '}
              <button
                className="font-mono underline decoration-dotted underline-offset-2 hover:text-neutral-300"
                onClick={() => {
                  setOpenInput(lastJar);
                }}
                title="Click to paste last created"
              >
                {lastJar}
              </button>
            </p>
          )}
        </section>

        <div className="mt-8">
          <Slogan />
        </div>
      </div>
    </main>
  );
}
