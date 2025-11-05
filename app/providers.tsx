'use client';

import { ReactNode, useState } from 'react';
import { WagmiProvider } from 'wagmi';
import { config } from '@/lib/wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ToastProvider from '@/components/Toast';

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
