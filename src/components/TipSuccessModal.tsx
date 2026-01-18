'use client';

import React, { useState } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  amountEth: string; // as string from state
  txHash?: string;
  jarAddress: string;
  shareLink?: string;
};

/**
 * TipSuccessModal
 *
 * Shown after a successful tip:
 * - displays amount, tx link and jar address
 * - optional share link with copy button
 */
export default function TipSuccessModal({
  open,
  onClose,
  amountEth,
  txHash,
  jarAddress,
  shareLink,
}: Props) {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const explorerTx = txHash
    ? `https://basescan.org/tx/${txHash}`
    : undefined;
  const explorerJar = jarAddress
    ? `https://basescan.org/address/${jarAddress}`
    : undefined;

  const onCopy = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-black/90 p-5 text-sm text-neutral-100 shadow-2xl">
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full bg-white/10 px-2 py-1 text-xs text-neutral-200 hover:bg-white/20"
        >
          ×
        </button>

        <div className="mb-3 text-center">
          <h2 className="text-lg font-semibold text-white">
            Thanks for your tip! 💙
          </h2>
          <p className="mt-1 text-xs text-neutral-400">
            Your support just went on-chain on Base.
          </p>
        </div>

        <div className="space-y-4">
          {/* Amount */}
          <div className="rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-center">
            <div className="text-xs uppercase tracking-wide text-neutral-400">
              Amount
            </div>
            <div className="text-xl font-semibold text-white">
              {amountEth || '0'} ETH
            </div>
          </div>

          {/* Links */}
          <div className="space-y-2 text-xs">
            {explorerTx && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-neutral-400">Transaction</span>
                <a
                  href={explorerTx}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md bg-white/10 px-3 py-1 text-xs text-neutral-50 hover:bg-white/20"
                >
                  View on Basescan
                </a>
              </div>
            )}

            {explorerJar && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-neutral-400">Jar contract</span>
                <a
                  href={explorerJar}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md bg-white/10 px-3 py-1 text-xs text-neutral-50 hover:bg-white/20"
                >
                  View jar
                </a>
              </div>
            )}
          </div>

          {/* Share link */}
          {shareLink && (
            <div className="space-y-1">
              <div className="text-[11px] uppercase tracking-wide text-neutral-400">
                Share this jar
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-xs text-neutral-200">
                  <span
                    className="block max-w-full truncate"
                    title={shareLink}
                  >
                    {shareLink}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onCopy}
                  className="shrink-0 rounded-lg bg-[#0052FF] px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 active:opacity-80"
                >
                  {copied ? 'Copied ✓' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          <div className="pt-2 text-[11px] text-neutral-500">
            You can keep tipping this jar or share the link with friends,
            followers and collaborators who want to support this address on
            Base.
          </div>
        </div>
      </div>
    </div>
  );
}
