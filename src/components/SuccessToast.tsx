'use client';

import React from 'react';
import { useToast, ToastItem } from '@/lib/ui/toast';

// Вьюпорт тостов: правый-низ экрана, Base-стиль, blur, мягкая тень
export default function SuccessToastViewport() {
  const { toasts, remove } = useToast();

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-[360px] flex-col gap-2 p-2"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} item={t} onClose={() => remove(t.id)} />
      ))}
    </div>
  );
}

function ToastCard({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const variantClasses =
    item.variant === 'error'
      ? 'border-red-500/30 bg-red-500/10'
      : item.variant === 'info'
      ? 'border-white/10 bg-white/5'
      : 'border-[#0052FF]/30 bg-[#0052FF]/10'; // success → Base blue

  return (
    <div
      className={`pointer-events-auto overflow-hidden rounded-2xl border ${variantClasses} backdrop-blur-md shadow-lg`}
      role="status"
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="mt-0.5 shrink-0 text-lg leading-none">💙</div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{item.title}</div>
          {item.description && (
            <div className="mt-0.5 text-sm text-neutral-300">{item.description}</div>
          )}
          {item.actions && item.actions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {item.actions.map((a, i) => (
                <a
                  key={i}
                  className="rounded-md bg-white/10 px-2 py-1 text-xs underline hover:bg-white/15"
                  href={a.href}
                  target={a.href.startsWith('http') ? '_blank' : undefined}
                  rel="noreferrer"
                >
                  {a.label}
                </a>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-neutral-300 hover:bg-white/10"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
