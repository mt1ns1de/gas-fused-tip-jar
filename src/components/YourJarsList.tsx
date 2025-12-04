// src/components/YourJarsList.tsx
'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { normalizeJars, type JarRow } from '@/lib/normalizeJars';

export default function YourJarsList() {
  const { address } = useAccount();

  const [rows, setRows] = useState<JarRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // анти-гидрационный флаг
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const canQuery = !!address;

  async function load() {
    if (!canQuery) return;
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`/api/jars?owner=${address}`, { cache: 'no-store' });
      const ctype = r.headers.get('content-type') || '';
      if (!ctype.includes('application/json')) {
        const text = await r.text();
        throw new Error(`Unexpected upstream response: ${text.slice(0, 200)}`);
      }
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(String(j?.error || 'Failed to load'));
      setRows(j.rows || []);
    } catch (e: any) {
      setErr(String(e?.message || 'Failed to load'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!canQuery) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canQuery, address]);

  const normalizedRows = useMemo(() => normalizeJars(rows), [rows]);

  const list = useMemo(
    () =>
      normalizedRows.map((r) => (
        <li key={r.jar} className="py-3">
          <div className="flex items-center justify-between gap-3">
            <code
              title={r.jar}
              className="max-w-[72ch] truncate rounded bg-white/5 px-2 py-1 text-[13px]"
            >
              {r.jar}
            </code>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(r.jar)}
                className="rounded-md bg-white/10 px-2 py-1 text-xs hover:bg-white/15"
                title="Copy address"
              >
                Copy
              </button>
              <a
                href={`https://basescan.org/address/${r.jar}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-md bg-white/10 px-2 py-1 text-xs hover:bg-white/15"
              >
                Scan
              </a>
              <Link
                href={`/jar/${r.jar}`}
                className="rounded-md bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15"
              >
                Open
              </Link>
            </div>
          </div>
        </li>
      )),
    [normalizedRows],
  );

  const Empty = () => (
    <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-neutral-400">
      No jars found for this owner.
    </div>
  );

  const ErrorBox = ({ text }: { text: string }) => (
    <div className="rounded-lg border border-red-400/30 bg-red-950/40 px-4 py-3 text-sm text-red-200">
      {text}
    </div>
  );

  const Skeleton = () => (
    <ul className="divide-y divide-white/10">
      {Array.from({ length: 3 }).map((_, i) => (
        <li key={i} className="py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
            <div className="h-7 w-16 animate-pulse rounded bg-white/10" />
          </div>
        </li>
      ))}
    </ul>
  );

  // до маунта всегда один и тот же скелетон
  if (!mounted) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
        <h3 className="mb-3 text-lg font-semibold text-center">Your Jars</h3>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <Skeleton />

          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              disabled
              className="rounded-md bg-white/10 px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Refresh
            </button>
            <div className="text-xs text-neutral-400">—</div>
          </div>
        </div>
      </section>
    );
  }

  const btnLabel = loading ? 'Refreshing…' : 'Refresh';
  const btnDisabled = loading || !address;
  const count = normalizedRows.length;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
      <h3 className="mb-3 text-lg font-semibold text-center">Your Jars</h3>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
        {!address ? (
          <Empty />
        ) : err ? (
          <ErrorBox text={err} />
        ) : loading ? (
          <Skeleton />
        ) : count === 0 ? (
          <Empty />
        ) : (
          <ul className="divide-y divide-white/10">{list}</ul>
        )}

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={load}
            disabled={btnDisabled}
            className="rounded-md bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15 disabled:opacity-50"
          >
            {btnLabel}
          </button>
          {count > 0 && (
            <div className="text-xs text-neutral-400">
              {count} {count === 1 ? 'jar' : 'jars'}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
