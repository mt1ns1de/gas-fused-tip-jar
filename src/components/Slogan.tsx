'use client';

import { useEffect, useState } from 'react';

const SLOGANS = [
  'Tips that move on Base.',
  'Fill the jar. Fuel the vibe.',
  'Your support, on Base.',
  'Make it count. On Base.',
  'Tap. Tip. Done.',
  'Drop a tip. Lift a creator.',
  'One tap to support.',
  'Support the jar. Grow the star.',
];

export default function Slogan() {
  const [mounted, setMounted] = useState(false);
  const [text, setText] = useState<string>('');

  useEffect(() => {
    setMounted(true);
    // choose slogan only on client to avoid SSR/CSR mismatch
    const i = Math.floor(Math.random() * SLOGANS.length);
    setText(SLOGANS[i]);
  }, []);

  // during SSR and before mount we render a fixed-height placeholder
  // to avoid layout differences during hydration.
  if (!mounted) {
    return <div className="h-6" />;
  }

  return (
    <div className="flex justify-center">
      {/* subtle breathing animation */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes subtlePulse {
            0%   { opacity: 0.55; }
            50%  { opacity: 1; }
            100% { opacity: 0.55; }
          }
        `,
        }}
      />
      <div
        className="text-center text-sm text-neutral-300 transition-opacity duration-700 ease-out"
        style={{ animation: 'subtlePulse 4.5s ease-in-out infinite' }}
      >
        {text}
      </div>
    </div>
  );
}
