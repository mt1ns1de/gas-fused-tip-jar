// app/api/jars/route.ts
import { NextResponse } from 'next/server';
import { env } from '@/config/env';

const ETHERSCAN_V2 = 'https://api.etherscan.io/v2/api';
const CHAIN_ID_BASE = 8453;

// Normalizes an address: trim, force 0x-prefix, lowercase.
function toLowerAddr(a: string) {
  const x = (a || '').trim();
  if (!x) return '';
  return x.startsWith('0x') ? x.toLowerCase() : ('0x' + x).toLowerCase();
}

function strip0x(h: string) {
  return h.startsWith('0x') ? h.slice(2) : h;
}

// Converts a 32-byte word (hex string) into an address (last 20 bytes).
function wordToAddress(word: string) {
  const w = strip0x(word).padStart(64, '0');
  return ('0x' + w.slice(24)).toLowerCase() as `0x${string}`;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const owner = toLowerAddr(url.searchParams.get('owner') || '');
    const factory = toLowerAddr(env.FACTORY_BASE_MAINNET || '');
    const apiKey = env.ETHERSCAN_API_KEY;

    if (!owner || owner.length !== 42) {
      return NextResponse.json({ ok: false, error: 'Bad owner' }, { status: 400 });
    }
    if (!factory || factory.length !== 42) {
      return NextResponse.json({ ok: false, error: 'Factory not set' }, { status: 500 });
    }
    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: 'Missing ETHERSCAN_API_KEY' },
        { status: 500 },
      );
    }

    const qs = new URLSearchParams({
      chainid: String(CHAIN_ID_BASE),
      module: 'logs',
      action: 'getLogs',
      address: factory,
      fromBlock: '0',
      toBlock: 'latest',
      apikey: apiKey,
    });

    // Small safety timeout and custom User-Agent.
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10_000);

    const r = await fetch(`${ETHERSCAN_V2}?${qs.toString()}`, {
      cache: 'no-store',
      headers: { 'User-Agent': 'gf-tipjar/1.0 (+https://basescan.org/)' },
      signal: ctrl.signal,
    }).catch((e) => {
      throw new Error(`Fetch failed: ${String((e as any)?.message || e)}`);
    });
    clearTimeout(t);

    const ctype = r.headers.get('content-type') || '';
    if (!ctype.includes('application/json')) {
      const text = await r.text().catch(() => '');
      return NextResponse.json(
        { ok: false, error: 'Upstream not JSON', detail: text.slice(0, 400) },
        { status: 502 },
      );
    }

    const j = await r.json().catch(() => null as any);
    if (!j) {
      return NextResponse.json(
        { ok: false, error: 'Invalid JSON from upstream' },
        { status: 502 },
      );
    }
    if (j.status === '0') {
      return NextResponse.json(
        { ok: false, error: j.result || 'Upstream error' },
        { status: 502 },
      );
    }

    const logs = (j.result || []) as Array<{
      address: string;
      blockNumber: string;
      topics: string[];
      data: string;
      transactionHash: string;
    }>;

    const topicOwner = '0x' + strip0x(owner).padStart(64, '0');

    const rows = logs
      .filter((lg) => (lg.topics?.[1] || '').toLowerCase() === topicOwner)
      .map((lg) => ({
        jar: wordToAddress(lg.data),
        blockNumber: lg.blockNumber,
        txHash: lg.transactionHash,
      }));

    const uniq = Array.from(new Map(rows.map((r) => [r.jar, r])).values()).sort(
      (a, b) => Number(BigInt(b.blockNumber) - BigInt(a.blockNumber)),
    );

    return NextResponse.json({ ok: true, rows: uniq }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || 'Internal error') },
      { status: 500 },
    );
  }
}
