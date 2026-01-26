import { ImageResponse } from 'next/og';

// Настройка метаданных картинки
export const runtime = 'edge';
export const alt = 'Gas-Fused Tip Jar on Base';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image({ params }: { params: { address: string } }) {
  const jarAddress = params.address;
  const shortAddr = `${jarAddress.slice(0, 8)}...${jarAddress.slice(-6)}`;

  return new ImageResponse(
    (
      // Контейнер (Background)
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000000',
          position: 'relative',
        }}
      >
        {/* Blue Glow Effect (Identity) */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '600px',
            height: '600px',
            backgroundImage: 'radial-gradient(circle, rgba(0, 82, 255, 0.25) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />

        {/* Content Wrapper */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          {/* Icon / Emoji */}
          <div style={{ fontSize: 64, marginBottom: 24 }}>⚡️</div>

          {/* Title */}
          <div
            style={{
              fontSize: 64,
              fontWeight: 900,
              color: 'white',
              marginBottom: 16,
              letterSpacing: '-0.02em',
              fontFamily: 'sans-serif',
            }}
          >
            Gas-Fused Tip Jar
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: 28,
              color: '#A0A0A0',
              marginBottom: 40,
              fontFamily: 'sans-serif',
            }}
          >
            Direct EVM protection. No backend. No bots.
          </div>

          {/* Address Box (Code style) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '16px',
              padding: '16px 32px',
              color: '#0052FF', // Base Blue text
              fontSize: 32,
              fontFamily: 'monospace',
              fontWeight: 600,
              boxShadow: '0 0 30px rgba(0, 82, 255, 0.15)',
            }}
          >
            {shortAddr}
          </div>
        </div>

        {/* Base Logo Text (Bottom) */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            fontSize: 20,
            color: '#444',
            fontFamily: 'sans-serif',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          Built on BASE
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}