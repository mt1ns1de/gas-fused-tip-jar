'use client';

import React from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  amountEth: string;
  txHash?: string;
};

export default function WithdrawSuccessModal({
  open,
  onClose,
  amountEth,
  txHash,
}: Props) {
  if (!open) return null;

  const explorerTx = txHash ? `https://basescan.org/tx/${txHash}` : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-black/90 p-6 text-sm text-neutral-100 shadow-2xl">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full bg-white/5 p-1.5 text-neutral-400 hover:bg-white/10 hover:text-white transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M10.5 3.5L3.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M3.5 3.5L10.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>

        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold text-white">Withdrawal Successful! 🎉</h2>
          <p className="mt-1 text-xs text-neutral-400">Funds have been sent to your wallet.</p>
        </div>

        <div className="space-y-5">
          {/* Amount Box */}
          <div className="rounded-xl border border-white/10 bg-white/5 py-4 text-center">
            <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">Amount withdrawn</div>
            <div className="mt-1 text-2xl font-bold text-white tracking-tight">{amountEth || '0'} ETH</div>
          </div>

          {/* Links Row */}
          <div className="flex gap-3">
            {explorerTx ? (
              <a href={explorerTx} target="_blank" rel="noreferrer" className="w-full rounded-lg bg-white/5 px-3 py-2.5 text-center text-xs font-medium text-neutral-300 hover:bg-white/10 transition-colors border border-white/5">
                View Transaction on Basescan ↗
              </a>
            ) : (
              <div className="w-full text-center text-xs text-neutral-500">
                Transaction sent
              </div>
            )}
          </div>
          
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-[#0052FF] py-2.5 text-sm font-semibold text-white hover:bg-[#004ad1] transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}