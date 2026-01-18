'use client';

import React from 'react';

type Props = {
  name?: string | null;
  address: `0x${string}`;
  size?: number; // px
};

/**
 * Avatar
 *
 * Small circular avatar:
 * - If name is present -> first letter of name
 * - Else -> first hex char of address (after 0x)
 * - Background color is derived from address, so each user has a stable color.
 */
export default function Avatar({ name, address, size = 32 }: Props) {
  const label =
    (name && name.trim()[0]) ||
    address.replace(/^0x/, '')[0] ||
    '?';

  // simple hash from address to pick a color
  const palette = [
    '#3b82f6',
    '#22c55e',
    '#ec4899',
    '#f97316',
    '#a855f7',
    '#06b6d4',
  ];

  let hash = 0;
  const addr = address.toLowerCase();
  for (let i = 0; i < addr.length; i++) {
    // tiny deterministic hash
    hash = (hash * 31 + addr.charCodeAt(i)) >>> 0;
  }
  const color = palette[hash % palette.length];

  const fontSize = size * 0.45;

  return (
    <div
      className="flex items-center justify-center rounded-full border border-white/15 shadow-sm"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 30% 0%, #ffffff33, ${color})`,
      }}
      title={name || address}
    >
      <span
        className="font-semibold text-white"
        style={{ fontSize }}
      >
        {label.toUpperCase()}
      </span>
    </div>
  );
}
