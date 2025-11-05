'use client';

import { useEffect, useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';

export default function WalletButton() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (!mounted) {
    // стабильная разметка на сервере и до mount
    return (
      <button className="rounded-xl bg-zinc-800 px-4 py-2 text-sm text-zinc-200 opacity-80">
        Connect
      </button>
    );
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-2">
        <span className="rounded-xl bg-zinc-800 px-3 py-1.5 text-sm">
          {address?.slice(0, 6)}…{address?.slice(-4)}
        </span>
        <button
          onClick={() => disconnect()}
          className="rounded-xl bg-zinc-800 px-3 py-1.5 text-sm hover:opacity-90"
        >
          Disconnect
        </button>
      </div>
    );
  }

  const injected = connectors.find(c => c.id === 'injected') ?? connectors[0];

  return (
    <button
      onClick={() => connect({ connector: injected })}
      disabled={isPending}
      className="rounded-xl bg-zinc-800 px-4 py-2 text-sm hover:opacity-90 disabled:opacity-60"
    >
      {isPending ? 'Connecting…' : 'Connect'}
    </button>
  );
}
