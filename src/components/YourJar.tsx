'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { formatEther } from 'viem';

import QrCode from '@/components/QrCode';
import { withdrawFromJar } from '@/actions/createJar.client';
import WithdrawSuccessModal from '@/components/WithdrawSuccessModal';

type Props = {
  jarAddress: `0x${string}` | string;
};

export default function YourJar({ jarAddress }: Props) {
  const publicClient = usePublicClient();
  const { address } = useAccount();

  const [owner, setOwner] = useState<string | null>(null);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [showQR, setShowQR] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Success modal state
  const [showSuccess, setShowSuccess] = useState(false);
  const [withdrawTx, setWithdrawTx] = useState<string | undefined>(undefined);
  const [withdrawnAmount, setWithdrawnAmount] = useState<string>('0');

  const addr = jarAddress as `0x${string}`;

  const isOwner =
    !!owner &&
    !!address &&
    owner.toLowerCase() === address.toLowerCase();

  const balanceLabel = useMemo(() => {
    if (balance === null) return '—';
    const eth = Number(formatEther(balance));
    return `${eth.toFixed(6)} ETH`;
  }, [balance]);

  const publicLink =
    typeof window !== 'undefined'
      ? `${window.location.origin}/jar/${addr}`
      : `/jar/${addr}`;

  // fetch owner + balance
  useEffect(() => {
    if (!publicClient) return;

    let alive = true;
    (async () => {
      try {
        const [ownerRes, balRes] = await Promise.all([
          publicClient.readContract({
            address: addr,
            abi: [
              {
                type: 'function',
                name: 'owner',
                inputs: [],
                outputs: [{ type: 'address' }],
                stateMutability: 'view',
              },
            ] as const,
            functionName: 'owner',
          }) as Promise<string>,
          publicClient.getBalance({ address: addr }),
        ]);

        if (!alive) return;
        setOwner(ownerRes);
        setBalance(balRes);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || 'Failed to load jar data.');
      }
    })();

    const id = setInterval(() => {
      if (!publicClient || !alive) return;
      publicClient
        .getBalance({ address: addr })
        .then((b) => {
          if (!alive) return;
          setBalance(b);
        })
        .catch(() => {});
    }, 25_000);

    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [publicClient, addr]);

  const onWithdraw = async () => {
    if (!isOwner || pending) return;
    setError(null);
    
    // Capture amount BEFORE withdraw to show in modal
    const amountToShow = balanceLabel.replace(' ETH', ''); 

    try {
      setPending(true);
      const res = await withdrawFromJar(addr);
      
      if (!res.success) {
        setError(res.error || 'Failed to withdraw funds.');
        return;
      }

      // Success -> show modal
      setWithdrawnAmount(amountToShow);
      setWithdrawTx(res.txHash);
      setShowSuccess(true);

      // update balance (attempt)
      if (publicClient) {
        try {
          const b = await publicClient.getBalance({ address: addr });
          setBalance(b);
        } catch { /* ignore */ }
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to withdraw funds.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-4 text-xs text-neutral-200 sm:text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-neutral-400">Jar address</div>
          <div
            className="max-w-[28rem] truncate font-mono text-[11px] text-neutral-100 sm:text-xs"
            title={addr}
          >
            {addr}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowQR((v) => !v)}
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-neutral-100 hover:bg-white/10"
        >
          {showQR ? 'Hide QR' : 'Show QR'}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/50 p-3">
          <div className="text-[11px] uppercase tracking-wide text-neutral-400">
            Owner
          </div>
          <div
            className="mt-1 max-w-[20rem] truncate text-xs text-neutral-100 sm:text-sm"
            title={owner || '—'}
          >
            {owner ?? '—'}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/50 p-3">
          <div className="text-[11px] uppercase tracking-wide text-neutral-400">
            Balance
          </div>
          <div className="mt-1 text-xs text-neutral-100 sm:text-sm">
            {balanceLabel}
          </div>
        </div>
      </div>

      {isOwner && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onWithdraw}
            disabled={pending}
            aria-busy={pending}
            className="rounded-xl bg-[#0052FF] px-4 py-2 text-xs font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50 hover:opacity-90 active:opacity-80 sm:text-sm"
          >
            {pending ? 'Withdrawing…' : 'Withdraw all'}
          </button>
          <p className="text-[11px] text-neutral-500 sm:text-xs">
            Only the jar owner can withdraw tips. Funds go to your
            connected wallet.
          </p>
        </div>
      )}

      {showQR && (
        <div className="mt-1">
          <QrCode value={publicLink} />
          <p className="mt-2 text-[11px] text-neutral-400 sm:text-xs">
            Scan to open this jar or share the link with supporters.
          </p>
        </div>
      )}

      {error && (
        <div className="mt-2 rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-[11px] text-red-200 sm:text-xs">
          {error}
        </div>
      )}

      {/* Withdraw Modal */}
      <WithdrawSuccessModal 
        open={showSuccess}
        onClose={() => setShowSuccess(false)}
        amountEth={withdrawnAmount}
        txHash={withdrawTx}
      />
    </div>
  );
}