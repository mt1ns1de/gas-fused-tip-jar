'use client';

import { useMemo } from 'react';

type Props = {
  currentGwei: number | null;
  capGwei: number | null;
};

type ProfileKey = 'unknown' | 'conservative' | 'balanced' | 'aggressive';

export default function GasProfileMeter({ currentGwei, capGwei }: Props) {
  const ratio = useMemo(() => {
    if (!currentGwei || !capGwei) return null;
    if (currentGwei <= 0 || capGwei <= 0) return null;
    return capGwei / currentGwei;
  }, [currentGwei, capGwei]);

  const profile: ProfileKey = useMemo(() => {
    if (ratio == null) return 'unknown';
    if (ratio < 1.1) return 'conservative';
    if (ratio <= 1.8) return 'balanced';
    return 'aggressive';
  }, [ratio]);

  const ratioLabel = ratio ? `${ratio.toFixed(2)}×` : null;

  const baseLine = (() => {
    if (!currentGwei || !capGwei || currentGwei <= 0 || capGwei <= 0) {
      return 'Set a cap to see how it compares to the current gas price.';
    }
    return `Base fee ${currentGwei.toFixed(3)} gwei · cap ${capGwei.toFixed(
      3,
    )} gwei`;
  })();

  const profileLine = (() => {
    if (!currentGwei || !capGwei || currentGwei <= 0 || capGwei <= 0) {
      return 'Tips only proceed if the network gas price is ≤ your cap.';
    }

    if (profile === 'unknown') {
      return 'Tips only proceed if the network gas price is ≤ your cap.';
    }

    const p = capitalize(profile);
    const r = ratioLabel ? ` (${ratioLabel})` : '';
    return `Profile: ${p}${r}. Tips only proceed if gas ≤ your cap.`;
  })();

  const segments: { key: ProfileKey; label: string }[] = [
    { key: 'conservative', label: 'Conservative' },
    { key: 'balanced', label: 'Balanced' },
    { key: 'aggressive', label: 'Aggressive' },
  ];

  return (
    <div className="mt-3 space-y-1 text-xs">
      <div className="flex overflow-hidden rounded-full border border-white/10 bg-white/5">
        {segments.map((seg, idx) => {
          const active = profile === seg.key;
          const isMiddle = idx === 1;
          return (
            <div
              key={seg.key}
              className={[
                'flex-1 px-3 py-1.5 text-center text-[12px] leading-tight',
                isMiddle ? 'border-x border-white/10' : '',
                active ? 'bg-white/10 text-white' : 'text-neutral-400',
              ].join(' ')}
            >
              {seg.label}
            </div>
          );
        })}
      </div>

      <p className="text-center text-[12px] text-neutral-300">{baseLine}</p>
      <p className="text-center text-[12px] text-neutral-400">{profileLine}</p>
    </div>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
