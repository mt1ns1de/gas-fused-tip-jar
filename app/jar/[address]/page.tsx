'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAccount, usePublicClient } from 'wagmi';
import CursorAura from '@/components/CursorAura';
import WalletButton from '@/components/WalletButton';
import { formatEther, parseEther } from 'viem';
import { getPrimaryName } from '@/lib/identity';
import Avatar from '@/components/Avatar';
import Slogan from '@/components/Slogan';
import TipSuccessModal from '@/components/TipSuccessModal';
// 🔥 Добавили импорт модалки вывода
import WithdrawSuccessModal from '@/components/WithdrawSuccessModal';
import { withdrawFromJar } from '@/actions/createJar.client';

import { useJarTips, type TipItem } from '@/hooks/useJarTips';
import { useEthPrice } from '@/hooks/useEthPrice';
import { useJarOwner } from '@/hooks/useJarOwner';
import { useJarGasFuse } from '@/hooks/useJarGasFuse';
import TipCard from '@/components/TipCard';

/* ========================= Utils ========================= */

function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

/* ========================= Page ========================= */

export default function JarPublicPage() {
  const mounted = useMounted();
  const publicClient = usePublicClient();
  const { isConnected, address } = useAccount();
  const params = useParams<{ address: string }>();
  const jar = params.address as `0x${string}`;

  /* ===== Amount / price / UI ===== */
  const [ethAmount, setEthAmount] = useState('0.0001');
  const { ethUsd } = useEthPrice();
  const [usdApprox, setUsdApprox] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [copied, setCopied] = useState(false);

  // success modal (TIP)
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastTx, setLastTx] = useState<string | null>(null);

  // success modal (WITHDRAW) 🔥
  const [showWithdrawSuccess, setShowWithdrawSuccess] = useState(false);
  const [withdrawTx, setWithdrawTx] = useState<string | undefined>(undefined);
  const [withdrawnAmount, setWithdrawnAmount] = useState<string>('0');

  // tip card modal
  const [showTipCard, setShowTipCard] = useState(false);

  /* ===== Tips feed (hook) ===== */
  const {
    tips,
    loadingFeed,
    justRefreshed,
    refreshIncremental,
    handleRefreshClick,
  } = useJarTips(jar, publicClient as any);

  // address -> name (.eth / .base) cache
  const [nameMap, setNameMap] = useState<Record<string, string | null>>({});

  /* ===== Owner panel (hook) ===== */
  const { owner, jarBalance, refreshOwner } = useJarOwner(
    jar,
    publicClient as any,
  );
  const [withdrawing, setWithdrawing] = useState(false);
  const canWithdraw =
    !!owner && !!address && owner.toLowerCase() === address.toLowerCase();

  /* ===== Local errors (tip + withdraw) ===== */
  const [tipError, setTipError] = useState<string | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  /* ===== Fuse / gas panel (hook) ===== */
  const { jarCapGwei, netGasGwei, fuseBadge, refreshGas } = useJarGasFuse(
    jar,
    publicClient as any,
  );
  const fuseDescription = fuseBadge?.description;

  /* ===== Helpers ===== */
  const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
  const displayName = (a: `0x${string}`) => {
    const n = nameMap[a.toLowerCase()];
    return n ?? shortAddr(a);
  };
  const fmtEth = (wei: bigint) => Number(formatEther(wei)).toFixed(6);
  const fmtUsd = (wei: bigint) => {
    if (!ethUsd) return '—';
    const eth = Number(formatEther(wei));
    const usd = eth * ethUsd;
    return usd < 0.01 ? '<$0.01' : `$${usd.toFixed(2)}`;
  };

  /* ========================= Debounced USD approximation ========================= */

  const debounceIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceIdRef.current) clearTimeout(debounceIdRef.current);
    debounceIdRef.current = setTimeout(() => {
      if (ethUsd && Number(ethAmount) >= 0) {
        const usd = Number(ethAmount) * ethUsd;
        setUsdApprox(`≈ $${usd < 0.01 ? '<0.01' : usd.toFixed(2)}`);
      } else {
        setUsdApprox(null);
      }
    }, 180);
    return () => {
      if (debounceIdRef.current) clearTimeout(debounceIdRef.current);
    };
  }, [ethAmount, ethUsd]);

  /* ========================= Stable USD presets (1/5/10/50) ========================= */

  const presetUsd = (usd: number) => {
    if (!ethUsd) return;
    const eth = usd / ethUsd;
    const fixed = Math.max(0, Number(eth.toFixed(6)));
    setEthAmount(String(fixed));
  };

  /* ========================= Input validation (ETH) ========================= */

  const onAmountChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const v = e.target.value.trim();
    if (!/^(\d+(\.\d{0,18})?|\.\d{0,18})?$/.test(v)) return;
    const normalized = v.replace(/^0+(\d)/, '$1');
    setEthAmount(normalized);
  };

  /* ========================= Send tip ========================= */

  const canSend = useMemo(
    () => isConnected && !!ethAmount && Number(ethAmount) > 0 && !cooldown,
    [isConnected, ethAmount, cooldown],
  );

  const onSend = async () => {
    if (!canSend) return;
    setTipError(null);
    try {
      setPending(true);
      setCooldown(true);
      const { sendTip } = await import('@/actions/sendTip.client');
      const res = await sendTip({
        jarAddress: jar,
        valueWei: parseEther(ethAmount),
        message: message || '',
      });
      if (res.success) {
        setMessage('');
        setLastTx(res.txHash || null);
        setShowSuccess(true);
        // parallel refresh: tips + owner + gas
        void refreshIncremental(true);
        void refreshOwner(true);
        void refreshGas(true);
      } else {
        setTipError(res.error || 'Failed to send tip.');
      }
    } catch (e: any) {
      setTipError(e?.message || 'Failed to send tip.');
    } finally {
      setPending(false);
      setTimeout(() => setCooldown(false), 1200);
    }
  };

  /* ========================= Resolve names (ens/basename) ========================= */

  useEffect(() => {
    const lower = (m: Record<string, string | null>) =>
      Object.fromEntries(
        Object.entries(m).map(([k, v]) => [k.toLowerCase(), v]),
      );
    const known = lower(nameMap);
    const unique = Array.from(
      new Set(tips.map((t) => t.from.toLowerCase())),
    ).slice(0, 25);
    const missing = unique.filter((a) => !(a in known));
    if (missing.length === 0) return;

    (async () => {
      const updates: Record<string, string | null> = {};
      const queue = [...missing];
      const workers = Array.from({ length: 3 }, async () => {
        while (queue.length) {
          const addrL = queue.shift()!;
          const addr = addrL as `0x${string}`;
          const name = await getPrimaryName(addr);
          updates[addrL] = name;
        }
      });
      await Promise.all(workers);
      setNameMap((prev) => ({ ...prev, ...updates }));
    })();
  }, [tips, nameMap]);

  /* ========================= Copy helpers ========================= */

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(jar);
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    } catch {
      // ignore
    }
  };

  const publicLink = useMemo(() => {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/jar/${jar}`;
  }, [jar]);

  /* ========================= Withdraw handler ========================= */

  const onWithdrawClick = async () => {
    if (!canWithdraw) return;
    setWithdrawError(null);

    // Запоминаем баланс ДО транзакции (чтобы показать в модалке)
    const amountToShow = jarBalance ? Number(formatEther(jarBalance)).toFixed(6) : '0';

    try {
      setWithdrawing(true);
      const res = await withdrawFromJar(jar);
      
      if (!res.success) {
        setWithdrawError(res.error || 'Failed to withdraw funds.');
      } else {
        // 🔥 УСПЕХ! Показываем модалку
        setWithdrawnAmount(amountToShow);
        setWithdrawTx(res.txHash);
        setShowWithdrawSuccess(true);

        await refreshOwner(true);
      }
    } catch (e: any) {
      setWithdrawError(e?.message || 'Failed to withdraw funds.');
    } finally {
      setWithdrawing(false);
    }
  };

  /* ========================= Refresh tips button handler ========================= */

  const onRefreshClick = async () => {
    if (loadingFeed) return;
    await handleRefreshClick();
  };

  if (!mounted) return null;

  /* ========================= Render ========================= */

  return (
    <main className="relative z-0 min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <CursorAura />

      {/* CENTRAL COLUMN */}
      <div className="mx-auto w-full max-w-3xl">
        {/* Top bar */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="rounded-md bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15"
          >
            ← Back to Home
          </Link>
          <WalletButton />
        </div>

        {/* Network + Jar address */}
        <p className="mb-2 text-sm text-neutral-400">
          Network: 8453 (Base Mainnet)
          <br />
          Jar{' '}
          <span
            title={jar}
            className="inline-block max-w-[52ch] truncate align-bottom"
          >
            {jar}
          </span>
          <button
            type="button"
            onClick={onCopy}
            className="ml-2 rounded-md bg-white/10 px-2 py-0.5 text-xs hover:bg-white/15"
          >
            {copied ? 'Copied ✓' : 'Copy'}
          </button>
        </p>

        {/* Tip card button (модалка) */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowTipCard(true)}
            className="inline-flex items-center rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20"
          >
            Open tip card
          </button>
        </div>

        {/* Fuse / gas state strip */}
        {jarCapGwei !== null && (
          <section className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-neutral-200 backdrop-blur-sm sm:text-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-neutral-300">
                  <span className="font-semibold text-white">
                    Jar fuse:
                  </span>{' '}
                  cap {jarCapGwei.toFixed(3)} gwei
                  {netGasGwei !== null && (
                    <>
                      {' · '}current base fee {netGasGwei.toFixed(3)} gwei
                    </>
                  )}
                </div>
                {fuseDescription && (
                  <div className="mt-1 text-[11px] text-neutral-400 sm:text-xs">
                    {fuseDescription}
                  </div>
                )}
              </div>
              {fuseBadge && (
                <span
                  className={
                    'inline-flex items-center rounded-full border px-3 py-1 text-[11px] sm:text-xs ' +
                    fuseBadge.className
                  }
                >
                  {fuseBadge.label}
                </span>
              )}
            </div>
          </section>
        )}

        {/* === OWNER PANEL (only visible to owner) === */}
        {canWithdraw && (
          <section className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-neutral-300">
                Owner panel
              </span>
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-4 text-sm">
              <div>
                <div className="text-neutral-400">Owner</div>
                <div
                  className="max-w-[56ch] truncate"
                  title={owner || '—'}
                >
                  {owner || '—'}
                </div>
              </div>
              <div>
                <div className="text-neutral-400">Jar balance</div>
                <div>
                  {jarBalance === null
                    ? '—'
                    : `${Number(formatEther(jarBalance)).toFixed(6)} ETH`}
                </div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => refreshOwner()}
                  className="rounded-md bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15"
                  disabled={withdrawing}
                >
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={onWithdrawClick}
                  disabled={withdrawing}
                  aria-busy={withdrawing}
                  className="rounded-xl bg-[#0052FF] px-4 py-2 font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50 hover:opacity-90 active:opacity-80"
                >
                  {withdrawing ? 'Withdrawing…' : 'Withdraw'}
                </button>
              </div>
            </div>

            {withdrawError && (
              <div className="mt-2 rounded-lg border border-red-400/30 bg-red-950/40 px-3 py-1 text-xs text-red-200">
                <div className="flex items-start gap-2">
                  <span className="mt-1 inline-block h-3 w-3 shrink-0 rounded-full bg-red-400/80" />
                  <div className="flex-1">{withdrawError}</div>
                  <button
                    onClick={() => setWithdrawError(null)}
                    className="ml-2 rounded-md bg-white/10 px-2 py-0.5 text-[11px] text-neutral-200 hover:bg-white/15"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Form card */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
          <label className="mb-2 block text-sm font-medium">
            Amount (ETH)
          </label>
          <div className="mb-2 flex items-center gap-2">
            <input
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 outline-none ring-0 focus:border-[#2563eb]"
              value={ethAmount}
              onChange={onAmountChange}
              inputMode="decimal"
              placeholder="0.0001"
            />
            <div className="shrink-0 text-sm text-neutral-400">
              {usdApprox ?? ' '}
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {[1, 5, 10, 50].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => presetUsd(v)}
                disabled={!ethUsd || pending}
                className="rounded-md bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15 disabled:opacity-50"
                title={ethUsd ? '' : 'Fetching ETH price…'}
              >
                ${v}
              </button>
            ))}
          </div>

          <label className="mb-2 block text-sm font-medium">
            Message (optional)
          </label>
          <textarea
            className="mb-4 h-32 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 outline-none ring-0 focus:border-[#2563eb]"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Say something nice ✨"
          />

          <button
            type="button"
            onClick={onSend}
            disabled={!canSend || pending}
            aria-busy={pending}
            className="rounded-xl bg-[#0052FF] px-5 py-2.5 font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50 hover:opacity-90 active:opacity-80"
          >
            {pending
              ? 'Sending…'
              : cooldown
              ? 'Please wait…'
              : 'Send Tip'}
          </button>

          {tipError && (
            <div className="mt-3 rounded-lg border border-red-400/30 bg-red-950/40 px-3 py-2 text-sm text-red-200">
              <div className="flex items-start gap-2">
                <span className="mt-1 inline-block h-3 w-3 shrink-0 rounded-full bg-red-400/80" />
                <div className="flex-1">{tipError}</div>
                <button
                  onClick={() => setTipError(null)}
                  className="ml-2 rounded-md bg-white/10 px-2 py-0.5 text-xs text-neutral-200 hover:bg-white/15"
                >
                  ×
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Tips card */}
        <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Recent tips</h3>
            <button
              type="button"
              onClick={onRefreshClick}
              disabled={loadingFeed}
              className="rounded-md bg-white/10 px-3 py-1.5 text-sm transition-colors hover:bg-white/15 disabled:opacity-60"
            >
              {loadingFeed
                ? 'Loading…'
                : justRefreshed
                ? 'Refreshed'
                : 'Refresh'}
            </button>
          </div>

          {tips.length === 0 ? (
            <div className="text-sm text-neutral-400">
              No tips yet. You can be the first one.
            </div>
          ) : (
            <ul className="divide-y divide-white/10">
              {tips.map((t: TipItem) => {
                const name = nameMap[t.from.toLowerCase()] || null;
                return (
                  <li key={`${t.txHash}`} className="py-3">
                    <div className="flex items-start gap-3">
                      <Avatar name={name} address={t.from} size={28} />
                      <div className="flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <div className="text-sm">
                            <div className="font-medium">
                              {fmtEth(t.amountWei)} ETH
                              <span className="ml-2 text-neutral-400">
                                ({fmtUsd(t.amountWei)})
                              </span>
                              {t.message && (
                                <span className="text-neutral-400">
                                  {' '}
                                  — “{t.message}”
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 text-xs text-neutral-400">
                              From{' '}
                              <span className="rounded bg-white/5 px-1.5 py-0.5">
                                {displayName(t.from)}
                              </span>
                              {' · '}Block #{t.blockNumber.toString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <a
                              href={`https://basescan.org/tx/${t.txHash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-md bg-white/10 px-2 py-1 text-xs underline hover:bg-white/15"
                            >
                              View tx
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="mt-8">
          <Slogan />
        </div>
      </div>

      {/* Success modal (TIP) */}
      <TipSuccessModal
        open={showSuccess}
        onClose={() => setShowSuccess(false)}
        amountEth={ethAmount}
        txHash={lastTx || undefined}
        jarAddress={jar}
        shareLink={publicLink}
      />

      {/* 🔥 Success modal (WITHDRAW) */}
      <WithdrawSuccessModal 
        open={showWithdrawSuccess}
        onClose={() => setShowWithdrawSuccess(false)}
        amountEth={withdrawnAmount}
        txHash={withdrawTx}
      />

      {/* Tip card modal */}
      {showTipCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <TipCard address={jar} onClose={() => setShowTipCard(false)} />
        </div>
      )}
    </main>
  );
}