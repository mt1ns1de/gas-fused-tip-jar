'use client';

import { useEffect } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  amountEth: string;
  txHash?: `0x${string}` | string;
  jarAddress: `0x${string}` | string;
  shareLink?: string;
};

export default function TipSuccessModal({
  open,
  onClose,
  amountEth,
  txHash,
  jarAddress,
  shareLink,
}: Props) {
  // короткий конфетти-шот в стиле Base (буква "B", мягкий выстрел ≤600ms)
  useEffect(() => {
    if (!open) return;

    const spawn = (x: number, y: number) => {
      const s = document.createElement('span');
      s.textContent = 'B';
      s.className =
        'pointer-events-none fixed z-[100] select-none font-extrabold drop-shadow-[0_0_6px_rgba(0,82,255,0.6)]';
      s.style.left = `${x}px`;
      s.style.top = `${y}px`;
      s.style.color = '#0052FF';
      s.style.fontSize = `${10 + Math.random() * 8}px`;
      s.style.opacity = '0.95';
      document.body.appendChild(s);

      const dx = (Math.random() - 0.5) * 160;
      const dy = 120 + Math.random() * 80;
      const rot = (Math.random() - 0.5) * 720;

      s.animate(
        [
          { transform: 'translate(0,0) rotate(0deg)', opacity: 0.95 },
          { transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg)`, opacity: 0 },
        ],
        { duration: 600, easing: 'ease-out' }
      ).onfinish = () => s.remove();
    };

    const { innerWidth, innerHeight } = window;
    const cx = innerWidth / 2;
    const cy = innerHeight / 3;
    for (let i = 0; i < 36; i++) {
      setTimeout(() => spawn(cx + (Math.random() - 0.5) * 40, cy + (Math.random() - 0.5) * 20), i * 8);
    }
  }, [open]);

  if (!open) return null;

  const basescanTx = txHash ? `https://basescan.org/tx/${txHash}` : undefined;
  const basescanAddr = `https://basescan.org/address/${jarAddress}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[90] grid place-items-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-950/90 p-6 text-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-semibold">Tip sent 🎉</h3>
        <p className="mt-1 text-neutral-300">
          Thanks! Your tip <span className="font-medium">{amountEth} ETH</span> is on Base.
        </p>

        <div className="mt-4 space-x-2 space-y-2 text-sm">
          {basescanTx && (
            <a
              href={basescanTx}
              target="_blank"
              rel="noreferrer"
              className="inline-block rounded-md bg-white/10 px-3 py-1.5 underline hover:bg-white/15"
            >
              View transaction on Basescan
            </a>
          )}
          <a
            href={basescanAddr}
            target="_blank"
            rel="noreferrer"
            className="inline-block rounded-md bg-white/10 px-3 py-1.5 underline hover:bg-white/15"
          >
            Open jar on Basescan
          </a>
          {shareLink && (
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(shareLink);
                } catch {}
              }}
              className="inline-block rounded-md bg-white/10 px-3 py-1.5 hover:bg-white/15"
            >
              Copy jar link
            </button>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-[#0052FF] px-5 py-2.5 font-medium text-white transition hover:opacity-90 active:opacity-80"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
