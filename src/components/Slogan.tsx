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
    // Выбираем слоган только на клиенте, чтобы не было рассинхрона SSR/CSR
    const i = Math.floor(Math.random() * SLOGANS.length);
    setText(SLOGANS[i]);
  }, []);

  // Во время SSR и до маунта выводим пустой плейсхолдер фиксированной высоты,
  // чтобы не было различий в разметке при гидрации.
  if (!mounted) {
    return <div className="h-6" />;
  }

  return (
    <div className="flex justify-center">
      {/* лёгкое «дыхание» без навязчивости */}
      <style
        // инлайн-стили безопасны, а ключевые кадры уникальны по имени
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
