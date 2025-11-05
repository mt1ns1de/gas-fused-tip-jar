'use client';

import { useEffect, useMemo, useState } from 'react';

type Cta = { label: string; href: string; target?: '_self' | '_blank' };

type ShareModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  /** Публичная ссылка на /jar/[address] */
  link?: string;
  /** Показать кнопку Copy link */
  showCopy?: boolean;
  /** Основная кнопка (слева) — например, Open public page / Open Jar page */
  primaryCta?: Cta;
  /** Дополнительная кнопка (справа) — например, View on Basescan */
  secondaryCta?: Cta;
};

export default function ShareModal({
  open,
  onClose,
  title,
  subtitle,
  link,
  showCopy = true,
  primaryCta,
  secondaryCta,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  const displayLink = link ?? '';

  const onCopy = async () => {
    try {
      if (!displayLink) return;
      await navigator.clipboard.writeText(displayLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // fallback: ничего не делаем
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-gradient-to-b from-[#0a1630] to-[#0a0f1f] p-6 text-white shadow-2xl">
        <h3 className="text-2xl font-bold">{title}</h3>
        {subtitle && <p className="mt-2 text-sm text-neutral-300">{subtitle}</p>}

        <div className="mt-4">
          <label className="mb-1 block text-xs text-neutral-400">Public link</label>
          <div className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-neutral-200">
            {displayLink || '—'}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {showCopy && (
            <button
              type="button"
              onClick={onCopy}
              className="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
            >
              {copied ? 'Copied ✓' : 'Copy link'}
            </button>
          )}

          {primaryCta && (
            <a
              href={primaryCta.href}
              target={primaryCta.target ?? '_self'}
              rel={primaryCta.target === '_blank' ? 'noreferrer' : undefined}
              className="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
            >
              {primaryCta.label}
            </a>
          )}

          {secondaryCta && (
            <a
              href={secondaryCta.href}
              target={secondaryCta.target ?? '_blank'}
              rel="noreferrer"
              className="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
            >
              {secondaryCta.label}
            </a>
          )}

          <div className="grow" />
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-[#2563eb] px-4 py-2 text-sm font-medium text-white hover:opacity-90 active:opacity-80"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
