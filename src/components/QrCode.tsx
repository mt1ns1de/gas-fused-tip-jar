import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

export default function QrCode({ value }: { value: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 1. QR Code Generation
  useEffect(() => {
    if (!canvasRef.current) return;

    // Radical Simplicity: Adhere to ISO standards.
    // Scanners expect high contrast: Dark dots on Light background.
    // Inverted colors (white on black) often fail on standard cameras.
    QRCode.toCanvas(canvasRef.current, value, {
      width: 260, // Optimal size for scanning
      margin: 2,  // "Quiet Zone" - white border required by scanners
      color: {
        dark: '#000000',  // Dots: Absolute Black
        light: '#ffffff', // Background: Absolute White
      },
      errorCorrectionLevel: 'M', // Balance between density and readability
    }).catch((err) => {
      console.error('QR Generation failed:', err);
    });
  }, [value]);

  // 2. Download Event Handler
  useEffect(() => {
    const handleDownload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      try {
        const link = document.createElement('a');
        link.download = 'tip-jar-qr.png';
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        console.error('Download failed:', err);
      }
    };

    // Listen for the download trigger
    window.addEventListener('qr:download', handleDownload);

    // CLEANUP: Crucial to prevent duplicate downloads and memory leaks
    return () => {
      window.removeEventListener('qr:download', handleDownload);
    };
  }, []);

  return (
    // Wrapped in a white container to ensure contrast even in Dark Mode
    <div className="bg-white p-3 rounded-2xl inline-block shadow-lg">
      <canvas 
        ref={canvasRef} 
        className="block rounded-lg"
        style={{ width: '100%', height: 'auto' }}
      />
    </div>
  );
}