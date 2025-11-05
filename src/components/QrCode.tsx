'use client';

import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

export default function QrCode({ value }: { value: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, value, {
      width: 300,
      margin: 1,
      color: {
        dark: '#ffffff',
        light: '#00000000',
      },
    }).catch(() => {});
  }, [value]);

  // глобальный евент на скачивание PNG
  useEffect(() => {
    const onDownload = () => {
      const c = canvasRef.current;
      if (!c) return;
      const url = c.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = 'jar-qr.png';
      a.click();
    };
    window.addEventListener('qr:download', onDownload);
    return () => window.removeEventListener('qr:download', onDownload);
  }, []);

  return (
    <div className="inline-block rounded-xl border border-white/10 bg-black/50 p-3">
      <canvas ref={canvasRef} width={300} height={300} />
    </div>
  );
}
