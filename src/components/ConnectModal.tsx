// src/components/ConnectModal.tsx
'use client'

import { useMemo, useState } from 'react'
import { useConnect, useSwitchChain } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'

type Props = { open: boolean; onClose: () => void; targetChainId?: number }

export default function ConnectModal({ open, onClose, targetChainId = baseSepolia.id }: Props) {
  const { connectors, connectAsync, status, error } = useConnect()
  const { switchChainAsync } = useSwitchChain()
  const [busy, setBusy] = useState(false)

  const options = useMemo(
    () =>
      connectors.map((c) => ({
        id: c.id,
        name: c.name === 'Injected' ? 'Injected (MetaMask/Rabby)' : c.name,
        ready: c.ready,
      })),
    [connectors]
  )

  if (!open) return null

  async function handleConnect(id: string) {
    try {
      setBusy(true)
      const connector = connectors.find((c) => c.id === id) ?? connectors[0]
      await connectAsync({ connector })
      await switchChainAsync({ chainId: targetChainId })
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60">
      <div className="w-[420px] rounded-2xl bg-zinc-900 p-5 shadow-xl">
        <div className="mb-3 text-lg font-semibold">Connect a wallet</div>
        <div className="mb-4 grid gap-2">
          {options.map((o) => (
            <button
              key={o.id}
              onClick={() => handleConnect(o.id)}
              disabled={busy}
              className="w-full rounded-xl border border-white/10 px-4 py-3 text-left hover:bg-white/5 disabled:opacity-50"
              title={o.ready ? '' : 'Extension not detected — click to try anyway'}
            >
              {o.name} {!o.ready && <span className="opacity-60">· not detected</span>}
            </button>
          ))}
        </div>
        {status === 'error' && (
          <div className="mb-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error?.message ?? 'Connection error'}
          </div>
        )}
        <div className="flex justify-end">
          <button onClick={onClose} className="rounded-lg bg-white/10 px-4 py-2 hover:bg-white/20">Cancel</button>
        </div>
      </div>
    </div>
  )
}
