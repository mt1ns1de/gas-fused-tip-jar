'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import QrCode from '@/components/QrCode';

type TipCardProps = {
  address: string;
  onClose?: () => void; // optional close handler (for modal)
};

export default function TipCard({ address, onClose }: TipCardProps) {
  const [publicUrl, setPublicUrl] = useState('');
  const [copied, setCopied] = useState(false);

  // Construct link only on the client
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPublicUrl(`${window.location.origin}/jar/${address}`);
    }
  }, [address]);

  const handleCopy = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  };

  const shortAddress =
    address.length > 16
      ? `${address.slice(0, 8)}…${address.slice(-6)}`
      : address;

  return (
    <div className="relative mx-auto w-full max-w-sm rounded-2xl border border-white/10 bg-black/40 p-6 text-white backdrop-blur-md">
      {/* Close button — only if onClose is provided */}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full bg-white/10 px-2 py-1 text-sm leading-none text-neutral-200 hover:bg-white/20"
          aria-label="Close"
        >
          ×
        </button>
      )}

      {/* Mascot */}
      <div className="mb-4 mt-2 flex justify-center">
        <Image
          src="/gf-mascot.png"
          alt="Gas-Fused mascot"
          width={90}
          height={90}
          priority
          className="select-none drop-shadow-[0_0_18px_rgba(0,82,255,0.45)]"
        />
      </div>

      <h1 className="mb-1 text-center text-xl font-semibold">
        Send a tip on Base
      </h1>
      <p className="mb-5 text-center text-sm text-neutral-400">
        Scan the code or share the link below.
      </p>

      {/* QR Code */}
      <div className="flex justify-center">
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          {publicUrl ? (
            <QrCode value={publicUrl} />
          ) : (
            <div className="flex h-[180px] w-[180px] items-center justify-center text-xs text-neutral-500">
              Preparing…
            </div>
          )}
        </div>
      </div>

      {/* Address (label identifying the jar) */}
      <p
        className="mt-4 text-center text-xs text-neutral-500"
        title={address}
      >
        Jar: {shortAddress}
      </p>

      {/* Copy Button */}
      <button
        type="button"
        onClick={handleCopy}
        disabled={!publicUrl}
        className="mt-4 w-full rounded-lg bg-[#0052FF] py-2 text-sm font-medium transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {copied ? 'Copied ✓' : 'Copy tip link'}
      </button>
    </div>
  );
}