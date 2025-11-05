"use client";

import { useState } from "react";
import QrCode from "./QrCode";

export default function SharePanel({ jarAddress }: { jarAddress: `0x${string}` }) {
  const link = typeof window !== "undefined"
    ? `${window.location.origin}/jar/${jarAddress}`
    : `/jar/${jarAddress}`;

  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  }

  async function onShare() {
    if ((navigator as any).share) {
      try {
        await (navigator as any).share({
          title: "Send a tip",
          text: "Tip me on Base via Tip Jar",
          url: link,
        });
      } catch {}
    } else {
      onCopy();
    }
  }

  function onDownloadQR() {
    // делегируем скачивание самому QrCode через кастомный евент
    const ev = new CustomEvent('qr:download');
    window.dispatchEvent(ev);
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button onClick={onCopy} className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs hover:border-zinc-700">
        {copied ? "Copied!" : "Copy link"}
      </button>
      <a
        className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs hover:border-zinc-700 underline"
        href={link}
        target="_blank"
        rel="noreferrer"
      >
        Open public page
      </a>
      <button onClick={onShare} className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs hover:border-zinc-700">
        Share
      </button>
      <button
        onClick={() => setShowQR((v) => !v)}
        className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs hover:border-zinc-700"
      >
        {showQR ? "Hide QR" : "Show QR"}
      </button>

      {showQR && (
        <div className="mt-3 flex w-full items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
          <div className="shrink-0">
            <div className="rounded-xl border border-zinc-800 p-2">
              <QrCode value={link} />
            </div>
          </div>
          <div className="space-y-1 text-xs text-zinc-400">
            <div>Scan to open: <span className="text-zinc-200">{link}</span></div>
            <button onClick={onDownloadQR} className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs hover:border-zinc-700">
              Download PNG
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
