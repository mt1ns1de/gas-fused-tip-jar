'use client';

import Image from 'next/image';
import React from 'react';

/**
 * MascotBadge
 *
 * Renders the original gf-mascot.png from /public
 * with a subtle floating animation.
 */
export default function MascotBadge() {
  return (
    <div className="pointer-events-none select-none">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes gfMascotFloat {
              0%   { transform: translateY(0px); }
              50%  { transform: translateY(-4px); }
              100% { transform: translateY(0px); }
            }
          `,
        }}
      />
      <div
        className="relative"
        style={{
          animation: 'gfMascotFloat 4s ease-in-out infinite',
        }}
      >
        <Image
          src="/gf-mascot.png"
          alt="Gas-Fused mascot"
          width={64}
          height={64}
          priority
          className="drop-shadow-[0_0_16px_rgba(0,0,0,0.5)]"
        />
      </div>
    </div>
  );
}
