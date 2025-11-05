'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePublicClient } from 'wagmi';
import { formatEther, parseAbiItem } from 'viem';

type Tip = {
  txHash: `0x${string}`;
  blockNumber: bigint;
  from: `0x${string}`;
  amountWei: bigint;
  message: string;
};

function short(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 3, delayMs = 700): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

export default function RecentTips({ jarAddress }: { jarAddress: `0x${string}` }) {
  const publicClient = usePublicClient();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tips, setTips] = useState<Tip[]>([]);
  const [usd, setUsd] = useState<number | null>(null);

  // Цена ETH
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
          { cache: 'no-store' }
        );
        const j = await r.json();
        if (!alive) return;
        const price = j?.ethereum?.usd as number | undefined;
        setUsd(price && isFinite(price) ? price : null);
      } catch {
        setUsd(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const fetchLogs = async () => {
    if (!publicClient) return;
    setBusy(true);
    setError(null);
    try {
      const latest = await withRetry(() => publicClient.getBlockNumber());
      const span = 50_000n;
      const from = latest > span ? latest - span : 0n;
      const to = latest;

      const event = parseAbiItem(
        'event Tipped(address indexed from, uint256 amount, string message)'
      );

      const logs = await withRetry(() =>
        publicClient.getLogs({
          address: jarAddress,
          fromBlock: from,
          toBlock: to,
          event,
        })
      );

      const rows: Tip[] = (logs || [])
        .map((l) => {
          const fromAddr = l.args?.from as `0x${string}` | undefined;
          const amount = l.args?.amount as bigint | undefined;
          const message = (l.args?.message as string | undefined) ?? '';
          if (!fromAddr || amount === undefined) return null;
          return {
            txHash: l.transactionHash!,
            blockNumber: l.blockNumber!,
            from: fromAddr,
            amountWei: amount,
            message,
          } as Tip;
        })
        .filter(Boolean) as Tip[];

      rows.sort((a, b) => (a.blockNumber > b.blockNumber ? -1 : 1));
      setTips(rows);
    } catch (e: any) {
      const msg =
        e?.shortMessage || e?.message || 'HTTP request failed.';
      setError(msg);
      setTips([]);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicClient, jarAddress]);

  const items = useMemo(() => tips.slice(0, 20), [tips]);

  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-lg font-semibold">Recent tips</div>
        <button
          onClick={fetchLogs}
          disabled={busy}
          className="rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15 disabled:opacity-50"
        >
          {busy ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {!items.length && !busy && !error && (
        <div className="text-neutral-300">No tips yet — be the first!</div>
      )}

      <ul className="space-y-3">
        {items.map((t) => {
          const eth = Number(formatEther(t.amountWei));
          const usdText =
            usd && isFinite(usd)
              ? (() => {
                  const x = eth * usd;
                  if (x < 0.01 && x > 0) return '<$0.01';
                  return `$${x.toFixed(2)}`;
                })()
              : null;

          return (
            <li
              key={`${t.txHash}-${t.blockNumber.toString()}`}
              className="rounded-xl border border-white/10 bg-black/30 p-4"
            >
              <div className="text-base font-semibold tabular-nums">
                {eth.toFixed(6)} ETH{' '}
                {usdText ? <span className="text-neutral-400">({usdText})</span> : null}
              </div>
              <div className="mt-1 text-sm text-neutral-400">
                From{' '}
                <button
                  className="rounded bg-white/5 px-2 py-[2px] text-neutral-200 hover:bg-white/10"
                  onClick={() => navigator.clipboard.writeText(t.from)}
                  title="Copy address"
                >
                  {short(t.from)}
                </button>{' '}
                · Block <span className="tabular-nums">#{t.blockNumber.toString()}</span>
              </div>
              {t.message && (
                <div className="mt-2 text-sm text-neutral-200">“{t.message}”</div>
              )}
              <div className="mt-2">
                <a
                  className="text-sm text-[#7ab4ff] underline"
                  href={`https://basescan.org/tx/${t.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View tx
                </a>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
