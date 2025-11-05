'use client';

import { useEffect, useRef } from 'react';

/**
 * Простая SVG-"банка".
 * progress: 0..1 — уровень заполнения
 * pulse: пульсация свечения
 */
export default function JarVisual({
  progress = 1,
  pulse = false,
  size = 120,
}: {
  progress?: number;
  pulse?: boolean;
  size?: number;
}) {
  const pct = Math.max(0, Math.min(1, progress));
  const height = size;
  const width = size * 0.7;
  const stroke = 3;
  const radius = 12;
  const innerPadding = 8;
  const fillHeight = (height - innerPadding * 2) * pct;
  const y = height - innerPadding - fillHeight;

  const particlesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // простые "капли" при монтировании
    const root = particlesRef.current;
    if (!root) return;
    for (let i = 0; i < 18; i++) {
      const s = document.createElement('span');
      s.textContent = '•';
      s.style.position = 'absolute';
      s.style.left = `${Math.random() * 100}%`;
      s.style.top = `${-10 - Math.random() * 20}px`;
      s.style.opacity = `${0.6 + Math.random() * 0.4}`;
      s.style.fontSize = `${6 + Math.random() * 10}px`;
      s.style.filter = 'drop-shadow(0 0 8px rgba(0,82,255,0.5))';
      s.style.color = '#7ab4ff';
      s.animate(
        [
          { transform: 'translateY(0) scale(1) rotate(0deg)' },
          {
            transform: `translate(${(Math.random() - 0.5) * 30}px, ${height / 2 + Math.random() * height / 3}px) scale(${1 + Math.random() * 0.6}) rotate(${(Math.random() - 0.5) * 120}deg)`,
          },
        ],
        { duration: 1200 + Math.random() * 800, easing: 'ease-out', delay: Math.random() * 400 }
      ).onfinish = () => s.remove();
      root.appendChild(s);
    }
  }, [height]);

  return (
    <div className="relative inline-block" style={{ width, height }}>
      {/* glow */}
      <div
        className={`pointer-events-none absolute -inset-6 -z-10 rounded-[24px] blur-2xl transition-opacity ${
          pulse ? 'opacity-80' : 'opacity-40'
        }`}
        style={{
          background:
            'radial-gradient(circle at 50% 80%, rgba(0,82,255,0.35), rgba(0,82,255,0) 60%)',
        }}
      />
      {/* particles */}
      <div ref={particlesRef} className="pointer-events-none absolute inset-0 overflow-hidden" />
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* outline jar */}
        <rect
          x={stroke}
          y={stroke}
          width={width - stroke * 2}
          height={height - stroke * 2}
          rx={radius}
          ry={radius}
          fill="rgba(255,255,255,0.02)"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={stroke}
        />
        {/* neck */}
        <rect
          x={width * 0.2}
          y={stroke}
          width={width * 0.6}
          height={height * 0.12}
          rx={radius / 2}
          ry={radius / 2}
          fill="rgba(255,255,255,0.04)"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={stroke * 0.8}
        />
        {/* fill */}
        <rect
          x={innerPadding + stroke}
          y={y}
          width={width - (innerPadding + stroke) * 2}
          height={fillHeight}
          rx={8}
          ry={8}
          fill="url(#jarFill)"
        />
        {/* gloss */}
        <rect
          x={innerPadding + stroke}
          y={innerPadding + stroke}
          width={(width - (innerPadding + stroke) * 2) * 0.25}
          height={height * 0.6}
          rx={12}
          ry={12}
          fill="rgba(255,255,255,0.06)"
        />
        <defs>
          <linearGradient id="jarFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7ab4ff" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#0052FF" stopOpacity="0.95" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
