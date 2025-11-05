// src/components/Avatar.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { getAvatar } from '@/lib/identity';

type Props = {
  name?: string | null;
  address?: `0x${string}` | string | null;
  size?: number;
  rounded?: 'full' | 'xl';
};

function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function makeIdenticonDataUrl(seedStr: string, size: number) {
  const seed = hashStr(seedStr);
  const cells = 5;
  const cell = Math.floor(size / cells);
  const pad = Math.floor((size - cell * cells) / 2);

  const hue = seed % 360;
  const sat = 60 + (seed % 30);
  const light = 45 + (seed % 20);
  const fg = `hsl(${hue}, ${sat}%, ${light}%)`;
  const bg = 'rgba(255,255,255,0.06)';

  const bits: number[] = [];
  let n = seed;
  for (let i = 0; i < cells * Math.ceil(cells / 2); i++) {
    n = (n ^ (n << 13)) >>> 0;
    n = (n ^ (n >>> 17)) >>> 0;
    n = (n ^ (n << 5)) >>> 0;
    bits.push(n & 1);
  }

  const rects: string[] = [];
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < Math.ceil(cells / 2); x++) {
      const idx = y * Math.ceil(cells / 2) + x;
      if (bits[idx]) {
        const rx = pad + x * cell;
        const ry = pad + y * cell;
        rects.push(`<rect x="${rx}" y="${ry}" width="${cell}" height="${cell}" />`);
        const mirrorX = cells - 1 - x;
        if (mirrorX !== x) {
          const rx2 = pad + mirrorX * cell;
          rects.push(`<rect x="${rx2}" y="${ry}" width="${cell}" height="${cell}" />`);
        }
      }
    }
  }

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <rect width="100%" height="100%" fill="${bg}"/>
  <g fill="${fg}">
    ${rects.join('\n    ')}
  </g>
</svg>`.trim();

  const encoded = typeof window !== 'undefined'
    ? window.btoa(unescape(encodeURIComponent(svg)))
    : Buffer.from(svg, 'utf-8').toString('base64');

  return `data:image/svg+xml;base64,${encoded}`;
}

export default function Avatar({ name, address, size = 32, rounded = 'full' }: Props) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!name) {
        setSrc(null);
        return;
      }
      const url = await getAvatar(name);
      if (alive) setSrc(url);
    })();
    return () => { alive = false; };
  }, [name]);

  const fallbackSrc = useMemo(() => {
    const key = (address || name || 'anon').toString().toLowerCase();
    return makeIdenticonDataUrl(key, size);
  }, [address, name, size]);

  const letter = useMemo(() => {
    const base = (name || address || '').toString();
    const clean = base.replace(/[^a-zA-Z0-9]/g, '');
    const ch = clean[0] || base[0] || '•';
    return ch.toUpperCase();
  }, [name, address]);

  const cls =
    rounded === 'xl'
      ? 'rounded-xl overflow-hidden'
      : 'rounded-full overflow-hidden';

  if (src) {
    return (
      <img
        src={src}
        alt={name || (address ? String(address) : 'avatar')}
        width={size}
        height={size}
        className={cls + ' border border-white/10 bg-white/5'}
        draggable={false}
      />
    );
  }

  if (address || name) {
    return (
      <img
        src={fallbackSrc}
        alt="identicon"
        width={size}
        height={size}
        className={cls + ' border border-white/10'}
        draggable={false}
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className={
        cls +
        ' grid place-items-center border border-white/10 bg-white/5 text-xs text-neutral-300'
      }
      title={name || ''}
    >
      {letter}
    </div>
  );
}
