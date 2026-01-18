'use client';

import React, { useState } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  link?: string;
};

/**
 * ShareModal
 *
 * Generic share modal used after jar creation.
 * Shows:
 * - title / subtitle
 * - shareable link with a copy button
 */
export default function ShareModal({
  open,
  onClose,
  title,
  subtitle,
  link,
}: Props) {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const onCopy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-black/90 p-5 text-sm text-neutral-100 shadow-2xl">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full bg-white/10 px-2 py-1 text-xs text-neutral-200 hover:bg-white/20"
        >
          ×
        </button>

        <div className="mb-3">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          {subtitle && (
            <p className="mt-1 text-xs text-neutral-400">{subtitle}</p>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <div className="mb-1 text-[11px] uppercase tracking-wide text-neutral-400">
              Share your link
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-xs text-neutral-200">
                {link ? (
                  <span className="block max-w-full truncate" title={link}>
                    {link}
                  </span>
                ) : (
                  <span className="text-neutral-500">
                    Link will appear here once the jar address is known.
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={onCopy}
                disabled={!link}
                className="shrink-0 rounded-lg bg-[#0052FF] px-3 py-1.5 text-xs font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50 hover:opacity-90 active:opacity-80"
              >
                {copied ? 'Copied ✓' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="text-[11px] text-neutral-500">
            You can drop this link into your X / Farcaster bio, add it to your
            website, or send it directly to friends who want to tip you on Base.
          </div>
        </div>
      </div>
    </div>
  );
}
