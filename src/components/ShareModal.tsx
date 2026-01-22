'use client';

import React, { useState } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  link?: string;
  txHash?: string;
};

export default function ShareModal({
  open,
  onClose,
  title,
  subtitle,
  link,
  txHash,
}: Props) {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const onCopy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch { /* ignore */ }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-black/90 p-6 text-sm text-neutral-100 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full bg-white/5 p-1.5 text-neutral-400 hover:bg-white/10 hover:text-white transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M10.5 3.5L3.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M3.5 3.5L10.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>

        <div className="mb-6 pr-8">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-neutral-400">{subtitle}</p>}
        </div>

        <div className="space-y-5">
          {/* Transaction Link */}
          {txHash && (
             <div className="flex">
               <a 
                 href={`https://basescan.org/tx/${txHash}`} 
                 target="_blank" 
                 rel="noreferrer" 
                 className="w-full rounded-lg bg-white/5 px-3 py-2.5 text-center text-xs font-medium text-neutral-300 hover:bg-white/10 transition-colors border border-white/5"
               >
                 View Creation Transaction ↗
               </a>
             </div>
          )}

          <div>
            <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-neutral-500">Share link</div>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/50 p-1.5 transition-colors focus-within:border-white/20 hover:border-white/20">
              <div className="flex-1 truncate px-2 text-xs font-mono text-neutral-300 select-all">
                {link || 'Generating link...'}
              </div>
              <button
                type="button"
                onClick={onCopy}
                disabled={!link}
                className="shrink-0 rounded-lg bg-[#0052FF] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#004ad1] active:scale-95 disabled:opacity-50"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="text-xs text-neutral-500 leading-relaxed">
            You can drop this link into your X bio, Farcaster profile, or send it directly to friends who want to support you on Base.
          </div>
        </div>
      </div>
    </div>
  );
}