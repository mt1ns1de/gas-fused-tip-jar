'use client';

import { useEffect, useRef } from 'react';

export default function CursorAura() {
  const auraRef = useRef<HTMLDivElement | null>(null);

  // Реальное, мгновенное движение свечения
  useEffect(() => {
    const el = auraRef.current!;
    const onMove = (e: MouseEvent) => {
      el.style.transform = `translate(${e.clientX - 150}px, ${e.clientY - 150}px)`;
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  // Эффект "падающих" B — меньшие, синие, с кружением
  useEffect(() => {
    const drop = (x: number, y: number) => {
      const s = document.createElement('span');
      s.textContent = 'B';
      s.className =
        'pointer-events-none fixed z-50 select-none font-extrabold drop-shadow-[0_0_6px_rgba(0,82,255,0.6)]';
      s.style.left = `${x}px`;
      s.style.top = `${y}px`;
      s.style.color = '#0052FF';
      s.style.fontSize = `${10 + Math.random() * 6}px`;
      s.style.opacity = '0.9';
      document.body.appendChild(s);

      const dx = (Math.random() - 0.5) * 80; // случайное отклонение по X
      const dy = 60 + Math.random() * 40; // падение вниз
      const rot = (Math.random() - 0.5) * 720; // вращение

      s.animate(
        [
          { transform: 'translate(0,0) rotate(0deg)', opacity: 0.9 },
          {
            transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg)`,
            opacity: 0,
          },
        ],
        { duration: 1000, easing: 'ease-out' }
      ).onfinish = () => s.remove();
    };

    const onClick = (e: MouseEvent) => drop(e.clientX, e.clientY);
    const onOver = (e: MouseEvent) => {
      if (Math.random() < 0.1) drop(e.clientX, e.clientY - 5);
    };

    window.addEventListener('click', onClick);
    document.addEventListener('mouseover', onOver, true);
    return () => {
      window.removeEventListener('click', onClick);
      document.removeEventListener('mouseover', onOver, true);
    };
  }, []);

  return (
    <>
      <div
        ref={auraRef}
        className="pointer-events-none fixed left-0 top-0 z-40 h-[300px] w-[300px] rounded-full 
        bg-[radial-gradient(circle_at_center,rgba(0,82,255,0.3),rgba(0,82,255,0)_60%)] blur-[100px]
        transition-transform duration-50 ease-linear"
        style={{ transform: 'translate(-9999px,-9999px)' }}
      />
    </>
  );
}
