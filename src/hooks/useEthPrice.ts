import { useEffect, useState } from 'react';

type UseEthPriceResult = {
  ethUsd: number | null;
  loading: boolean;
};

const STORAGE_KEY = 'eth_usd_price';

export function useEthPrice(): UseEthPriceResult {
  const [ethUsd, setEthUsd] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const loadFromStorage = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const { price } = JSON.parse(raw);
        return typeof price === 'number' ? price : null;
      } catch {
        return null;
      }
    };

    const fetchOnce = async () => {
      try {
        const r = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
          { cache: 'no-store' },
        );
        const j = await r.json();
        const price = j?.ethereum?.usd as number | undefined;
        if (alive && price) {
          setEthUsd(price);
          try {
            localStorage.setItem(
              STORAGE_KEY,
              JSON.stringify({ price, ts: Date.now() }),
            );
          } catch {
            // ignore cache write error
          }
        }
      } catch {
        // fallback to cached value if network fails
        const cached = loadFromStorage();
        if (alive && cached) {
          setEthUsd(cached);
        }
      } finally {
        if (alive) setLoading(false);
      }
    };

    // initial fetch
    fetchOnce();

    // periodic refresh
    const id = setInterval(() => {
      fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
        {
          cache: 'no-store',
        },
      )
        .then((r) => r.json())
        .then((j) => {
          const p = j?.ethereum?.usd as number | undefined;
          if (p && alive) setEthUsd(p);
        })
        .catch(() => {});
    }, 60_000);

    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return { ethUsd, loading };
}

// explicit re-export just in case tree-shaking goes weird
export default useEthPrice;
