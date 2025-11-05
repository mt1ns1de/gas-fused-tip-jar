'use client';

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

type ToastType = 'success' | 'error' | 'info';

export type Toast = {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number; // ms
};

type ToastCtx = {
  push: (t: Omit<Toast, 'id'>) => void;
};

const ToastContext = createContext<ToastCtx | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider/>');
  return ctx;
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const counter = useRef(0);

  const push = useCallback((t: Omit<Toast, 'id'>) => {
    const id = `t_${Date.now()}_${counter.current++}`;
    const toast: Toast = { id, duration: 3000, ...t };
    setItems((prev) => [...prev, toast]);
    // автоудаление
    const timer = setTimeout(() => {
      setItems((prev) => prev.filter((x) => x.id !== id));
    }, toast.duration);
    // небольшой safety: очистка при размонтировании не требуется (локальный таймер).
    return () => clearTimeout(timer);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* контейнер тостов */}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 p-2">
        {items.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto rounded-xl border border-white/10 bg-zinc-900/90 p-3 shadow-xl backdrop-blur-sm"
            role="status"
          >
            <div className="flex items-start gap-2">
              <span
                className={
                  'mt-0.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full ' +
                  (t.type === 'success'
                    ? 'bg-emerald-400'
                    : t.type === 'error'
                    ? 'bg-red-400'
                    : 'bg-blue-400')
                }
              />
              <div className="min-w-0">
                {t.title && <div className="mb-0.5 text-sm font-semibold">{t.title}</div>}
                <div className="text-sm text-zinc-200">{t.message}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
