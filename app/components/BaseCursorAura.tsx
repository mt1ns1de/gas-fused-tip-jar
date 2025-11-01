"use client";

/**
 * Лёгкая «аура» курсора в стиле Base (синие частицы).
 * Уважает prefers-reduced-motion: если включено — ничего не рисуем.
 * Без сторонних библиотек.
 */

import { useEffect, useRef } from "react";

export default function BaseCursorAura() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const stopRef = useRef<() => void>();

  useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const canvas = ref.current;
    if (!canvas || prefersReduced) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let dpr = Math.max(1, window.devicePixelRatio || 1);
    let w = window.innerWidth;
    let h = window.innerHeight;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      dpr = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    window.addEventListener("resize", resize);

    type Particle = { x: number; y: number; vx: number; vy: number; life: number };
    const particles: Particle[] = [];
    let mouseX = w / 2;
    let mouseY = h / 2;

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      spawn(6);
    };
    const onClick = () => spawn(12);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mousedown", onClick);

    function spawn(n: number) {
      for (let i = 0; i < n; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.8 + Math.random() * 1.2;
        particles.push({
          x: mouseX,
          y: mouseY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1
        });
      }
    }

    function step() {
      ctx.clearRect(0, 0, w, h);

      // лёгкое свечение вокруг курсора
      ctx.beginPath();
      const grd = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 60);
      grd.addColorStop(0, "rgba(0,82,255,0.25)");
      grd.addColorStop(1, "rgba(0,82,255,0)");
      ctx.fillStyle = grd;
      ctx.arc(mouseX, mouseY, 60, 0, Math.PI * 2);
      ctx.fill();

      // частицы
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;

        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = "#0052FF";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      raf = requestAnimationFrame(step);
    }

    let raf = requestAnimationFrame(step);

    stopRef.current = () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onClick);
      ctx.clearRect(0, 0, w, h);
    };

    return () => stopRef.current?.();
  }, []);

  return (
    <canvas
      ref={ref}
      className="pointer-events-none fixed inset-0 z-[40]"
      aria-hidden="true"
    />
  );
}
