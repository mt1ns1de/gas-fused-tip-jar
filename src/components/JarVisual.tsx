'use client';

import React from 'react';

type Props = {
  progress?: number; // 0..1
  size?: number;     // px
  pulse?: boolean;
};

/**
 * JarVisual
 *
 * Small decorative jar used on the Create Jar view.
 * - progress controls fill height (0..1)
 * - pulse toggles a soft animation on the liquid
 */
export default function JarVisual({
  progress = 0.5,
  size = 100,
  pulse = false,
}: Props) {
  const clamped = Math.max(0, Math.min(1, progress));
  const height = size;
  const width = size * 0.7;
  const fillHeight = clamped * (height * 0.65);
  const fillY = height * 0.8 - fillHeight;

  return (
    <div
      className="mx-auto flex items-center justify-center"
      style={{ width, height }}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="drop-shadow-[0_0_20px_rgba(0,82,255,0.35)]"
      >
        {/* Jar outline */}
        <defs>
          <linearGradient id="jar-outline" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#e5e7eb" />
            <stop offset="100%" stopColor="#9ca3af" />
          </linearGradient>
          <linearGradient id="jar-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
        </defs>

        <g>
          {/* Neck */}
          <rect
            x={width * 0.25}
            y={height * 0.05}
            width={width * 0.5}
            height={height * 0.08}
            rx={height * 0.02}
            fill="#020617"
            stroke="url(#jar-outline)"
            strokeWidth={1.4}
          />
          {/* Lid */}
          <rect
            x={width * 0.22}
            y={height * 0.02}
            width={width * 0.56}
            height={height * 0.04}
            rx={height * 0.02}
            fill="#111827"
            stroke="url(#jar-outline)"
            strokeWidth={1.2}
          />
          {/* Body */}
          <rect
            x={width * 0.15}
            y={height * 0.12}
            width={width * 0.7}
            height={height * 0.7}
            rx={width * 0.2}
            fill="#020617"
            stroke="url(#jar-outline)"
            strokeWidth={1.6}
          />
        </g>

        {/* Liquid */}
        <g className={pulse ? 'animate-pulse' : ''}>
          <rect
            x={width * 0.17}
            y={fillY}
            width={width * 0.66}
            height={fillHeight}
            rx={width * 0.18}
            fill="url(#jar-fill)"
            opacity={0.92}
          />
          {/* Glow line on surface */}
          <rect
            x={width * 0.2}
            y={fillY + 1}
            width={width * 0.6}
            height={height * 0.01}
            rx={height * 0.005}
            fill="#bfdbfe"
            opacity={0.9}
          />
        </g>
      </svg>
    </div>
  );
}