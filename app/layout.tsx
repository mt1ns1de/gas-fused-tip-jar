export const metadata = {
  title: "Gas-Fused Tip Jar",
  description: "Create a Tip Jar clone (EIP-1167) with gas fuses on Base Sepolia."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <header className="mb-6 flex items-center justify-between">
            <h1 className="text-xl font-semibold tracking-tight">Gas-Fused Tip Jar</h1>
            <a
              className="text-sm text-white/70 hover:text-white"
              href="https://sepolia.basescan.org/address/0x4432b13DABF32b67Bd41472e1350d7E083be6B01"
              target="_blank" rel="noreferrer"
            >
              Factory @ Base Sepolia
            </a>
          </header>
          {children}
          <footer className="mt-10 text-center text-xs text-white/50">
            Base Sepolia · chainId 84532
          </footer>
        </div>
      </body>
    </html>
  );
}
