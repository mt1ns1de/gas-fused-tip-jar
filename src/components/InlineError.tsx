'use client';

import { useEffect, useState } from 'react';

export default function InlineError({
  message,
  onClose,
  autoHideMs = 6000,
  compact = false,
}: {
  message?: string | null;
  onClose?: () => void;
  autoHideMs?: number;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(Boolean(message));

  useEffect(() => {
    setOpen(Boolean(message));
    if (!message) return;
    const t = setTimeout(() => {
      setOpen(false);
      onClose?.();
    }, autoHideMs);
    return () => clearTimeout(t);
  }, [message, autoHideMs, onClose]);

  if (!open || !message) return null;

  return (
    <div
      role="alert"
      className={[
        'mt-3 rounded-lg border border-red-400/30 bg-red-950/40 px-3 text-red-200',
        compact ? 'py-1 text-xs' : 'py-2 text-sm',
      ].join(' ')}
    >
      <div className="flex items-start gap-2">
        <span className="mt-1 inline-block h-3 w-3 shrink-0 rounded-full bg-red-400/80" />
        <div className="flex-1">{message}</div>
        <button
          onClick={() => {
            setOpen(false);
            onClose?.();
          }}
          aria-label="Close"
          className="ml-2 rounded-md bg-white/10 px-2 py-0.5 text-xs text-neutral-200 hover:bg-white/15"
        >
          ×
        </button>
      </div>
    </div>
  );
}
