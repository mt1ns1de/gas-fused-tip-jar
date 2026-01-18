'use client';

import React, { useMemo } from 'react';

type Props = {
  currentGwei: number | null;
  capGwei: number | null;
};

export default function GasProfileMeter({ currentGwei, capGwei }: Props) {
  const hasData =
    currentGwei !== null &&
    capGwei !== null &&
    currentGwei > 0 &&
    capGwei > 0;

  const { ratio, badge, barWidth } = useMemo(() => {
    if (!hasData || !currentGwei || !capGwei) {
      return { ratio: null as number | null, badge: null, barWidth: 0 };
    }

    // та же логика, что и на /jar/[address]: ratio = cap / current
    const r = capGwei / currentGwei;

    // мэппинг ratio → ширина полоски (0..2 → 0..100%)
    const normalized = Math.max(0, Math.min(r / 2, 1));
    const width = normalized * 100;

    let badge:
      | {
          label: string;
          className: string;
          description: string;
        }
      | null = null;

    if (r < 1) {
      badge = {
        label: 'Cap below gas',
        className: 'border-amber-400/60 bg-amber-500/10 text-amber-100',
        description:
          'Cap is currently below base fee. Some tips may revert until gas cools down.',
      };
    } else if (r <= 1.7) {
      badge = {
        label: 'Balanced fuse',
        className:
          'border-emerald-400/60 bg-emerald-500/10 text-emerald-100',
        description:
          'Cap is in a balanced zone. Supporters stay protected, most tips will go through.',
      };
    } else {
      badge = {
        label: 'Loose fuse',
        className: 'border-sky-400/60 bg-sky-500/10 text-sky-100',
        description:
          'Cap is well above current gas. Tips are unlikely to revert, but fees may be higher if gas spikes later.',
      };
    }

    return { ratio: r, badge, barWidth: width };
  }, [hasData, currentGwei, capGwei]);

  return (
    <div className="mt-4 w-full select-none">
      <div className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-sm">
        {/* шапка карточки — внутри бордера */}
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="text-xs font-medium text-neutral-300">
            GAS PROFILE
          </div>
          {badge && (
            <span
              className={
                'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] ' +
                badge.className
              }
            >
              {badge.label}
            </span>
          )}
        </div>

        {/* числа */}
        <div className="mb-2 text-sm text-neutral-300">
          <span className="font-semibold text-white">
            Current:{' '}
            {currentGwei !== null ? currentGwei.toFixed(3) : '—'} gwei
          </span>
          {' · '}
          <span className="font-semibold text-white">
            Cap: {capGwei !== null ? capGwei.toFixed(3) : '—'} gwei
          </span>
        </div>

        {/* описание */}
        <div className="mb-3 text-xs text-neutral-400">
          {hasData && badge
            ? badge.description
            : 'Waiting for gas data…'}
        </div>

        {/* плавная полоска */}
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-neutral-800/60">
          <div
            className="absolute left-0 top-0 h-full bg-[#0052FF]"
            style={{
              width: `${barWidth}%`,
              transition: 'width 0.6s cubic-bezier(0.25, 0.8, 0.25, 1)',
              boxShadow: barWidth
                ? '0 0 10px rgba(0, 82, 255, 0.7)'
                : 'none',
            }}
          />
        </div>

        <div className="mt-1 text-right text-[10px] text-neutral-500">
          ratio ≈ {ratio !== null ? ratio.toFixed(2) : '—'}
        </div>
      </div>
    </div>
  );
}
