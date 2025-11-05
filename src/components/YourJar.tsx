'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { formatEther } from 'viem';
import QrCode from '@/components/QrCode';
import { withdrawFromJar } from '@/actions/createJar.client';

export default function YourJar({ jarAddress }: { jarAddress: `0x${string}` | string }) {
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const [owner, setOwner] = useState<string | null>(null);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [showQR, setShowQR] = useState(true);
  const [pending, setPending] = useState(false);

  const addr = jarAddress as `0x${string}`;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!publicClient) return;
        const [ownerRaw, bal] = await Promise.all([
          publicClient.readContract({
            address: addr,
            abi: [
              { type: 'function', name: 'owner', inputs: [], outputs: [{ type: 'address' }], stateMutability: 'view' }
            ] as const,
            functionName: 'owner',
          }) as Promise<string>,
          publicClient.getBalance({ address: addr }),
        ]);
        if (!alive) return;
        setOwner(ownerRaw);
        setBalance(bal);
      } catch {}
    })();
    return () => { alive = false; };
  }, [publicClient, addr]);

  const link = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/jar/${addr}`;
  }, [addr]);

  const canWithdraw = !!owner && !!address && owner.toLowerCase() === address.toLowerCase();

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      alert('Copied link to clipboard');
    } catch {}
  };

  const onWithdraw = async () => {
    if (!canWithdraw) return;
    try {
      setPending(true);
      await withdrawFromJar(addr); // ✅ правильный вызов
      // refresh balance
      if (publicClient) {
        const bal = await publicClient.getBalance({ address: addr });
        setBalance(bal);
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div>
      <h3 className="mb-3 text-xl font-semibold">Your Jar</h3>

      <div className="mb-2 flex flex-wrap items-center gap-4 text-sm">
        <div className="w-full sm:w-auto">
          <div className="text-neutral-400">Jar address</div>
          <div className="max-w-[48ch] truncate" title={addr}>{addr}</div>
        </div>
        <div className="w-full sm:w-auto">
          <div className="text-neutral-400">Owner</div>
          <div className="max-w-[48ch] truncate" title={owner || '—'}>{owner || '—'}</div>
        </div>
        <div className="w-full sm:w-auto">
          <div className="text-neutral-400">Balance</div>
          <div>{balance === null ? '—' : `${Number(formatEther(balance)).toFixed(6)} ETH`}</div>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <button onClick={onCopy} className="rounded-md bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15">
          Copy link
        </button>
        <a className="rounded-md bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15" href={`/jar/${addr}`}>
          Open public page
        </a>
        <button onClick={() => setShowQR((s) => !s)} className="rounded-md bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15">
          {showQR ? 'Hide QR' : 'Show QR'}
        </button>
      </div>

      {showQR && (
        <div className="mb-5 rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="w-full max-w-[300px]">
              <QrCode value={link} />
            </div>
            <div className="text-sm text-neutral-300">
              <div className="mb-2 font-medium">Scan to open:</div>
              <div className="max-w-[56ch] truncate" title={link}>{link}</div>
              <button
                onClick={() => {
                  const ev = new CustomEvent('qr:download');
                  window.dispatchEvent(ev);
                }}
                className="mt-3 rounded-md bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15"
              >
                Download PNG
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <a className="rounded-md bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15"
           href={`https://basescan.org/address/${addr}`} target="_blank" rel="noreferrer">
          Open in Basescan
        </a>
        <button
          onClick={async () => {
            if (!publicClient) return;
            const bal = await publicClient.getBalance({ address: addr });
            setBalance(bal);
          }}
          className="rounded-md bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15"
        >
          Refresh
        </button>

        <button
          onClick={onWithdraw}
          disabled={!canWithdraw || pending}
          aria-busy={pending}
          className="ml-auto rounded-xl bg-[#0052FF] px-5 py-2.5 font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50 hover:opacity-90 active:opacity-80"
        >
          {pending ? 'Withdrawing…' : 'Withdraw'}
        </button>
      </div>
    </div>
  );
}
