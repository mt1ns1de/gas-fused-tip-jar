import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Gas-Fused Tip Jar on Base';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  
  // Fallback и форматирование
  const jarAddress = address || '0x0000...0000';
  const shortAddr = jarAddress.length > 10 
    ? `${jarAddress.slice(0, 6)}...${jarAddress.slice(-4)}`
    : jarAddress;

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#030303', // Чуть светлее чистого черного для глубины
          position: 'relative',
          border: '4px solid #111', // Рамка, чтобы картинка не терялась в светлом чате
        }}
      >
        {/* Яркое пятно (Reactor Core) */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '800px', // Шире
            height: '800px',
            // Усилили непрозрачность до 0.4 и добавили второй цвет
            backgroundImage: 'radial-gradient(circle, rgba(0, 82, 255, 0.4) 0%, rgba(0,0,0,0) 70%)',
            filter: 'blur(60px)',
          }}
        />

        {/* Grid pattern (Tech texture) - опционально, но добавляет "инженерности" */}
        <div
            style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
                maskImage: 'radial-gradient(circle, black 40%, transparent 100%)', // Маска, чтобы сетка была только в центре
            }} 
        />

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          {/* Emoji с тенью */}
          <div style={{ fontSize: 72, marginBottom: 20, textShadow: '0 0 40px rgba(255,200,0,0.6)' }}>⚡️</div>

          <div
            style={{
              fontSize: 70, // Чуть крупнее
              fontWeight: 900,
              color: 'white',
              marginBottom: 10,
              letterSpacing: '-0.03em',
              lineHeight: 1,
              fontFamily: 'sans-serif',
              textShadow: '0 0 20px rgba(0,0,0,0.8)', // Тень для читаемости на фоне свечения
            }}
          >
            Gas-Fused Tip Jar
          </div>

          <div
            style={{
              fontSize: 26,
              color: '#d1d5db', // Светло-серый, а не темный
              marginBottom: 50,
              fontFamily: 'sans-serif',
              fontWeight: 500,
            }}
          >
            Sovereign protection. 100% On-chain.
          </div>

          {/* NEON Address Box */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(0, 0, 0, 0.6)', // Темная подложка
              border: '2px solid #0052FF', // Яркая граница Base Blue
              borderRadius: '12px',
              padding: '16px 40px',
              color: '#fff', // Белый текст!
              fontSize: 36,
              fontFamily: 'monospace',
              fontWeight: 700,
              // Двойное свечение: рамки и самого блока
              boxShadow: '0 0 20px rgba(0, 82, 255, 0.4), inset 0 0 20px rgba(0, 82, 255, 0.1)',
            }}
          >
            {shortAddr}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            position: 'absolute',
            bottom: 30,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
           <div style={{
               height: 8,
               width: 8,
               borderRadius: '50%',
               background: '#0052FF',
               boxShadow: '0 0 10px #0052FF'
           }}/>
           <div style={{
            fontSize: 18,
            color: '#888',
            fontFamily: 'sans-serif',
            fontWeight: 600,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
          }}>
            Powered by Base
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}