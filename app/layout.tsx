// app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'Gas-Fused Tip Jar',
  description: 'Send and receive tips with gas protection on Base',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="base-bg relative min-h-screen text-zinc-100 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
