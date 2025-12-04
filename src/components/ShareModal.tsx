'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

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
    if (!open) {
      setCopied(false);
      return;
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const displayLink = link ?? '';

  const onCopy = async () => {
    try {
      if (!displayLink) return;
      await navigator.clipboard.writeText(displayLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="share-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="w-full max-w-xl rounded-2xl border border-[#2563eb]/50 bg-gradient-to-b from-[#0a1630] to-[#070b18] p-6 text-white shadow-[0_24px_70px_rgba(10,20,40,0.95)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold">{title}</h3>
            {subtitle && (
              <p className="mt-2 text-sm text-neutral-300">{subtitle}</p>
            )}

            <div className="mt-4">
              <label className="mb-1 block text-xs text-neutral-400">
                Public link
              </label>
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
