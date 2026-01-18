import TipCard from '@/components/TipCard';

type PageProps = {
  params: {
    address: string;
  };
};

/**
 * /card/[address]
 *
 * Public “tip card” page for sharing and QR usage.
 */
export default function JarCardPage({ params }: PageProps) {
  const { address } = params;

  return (
    <main className="min-h-screen w-full bg-black px-4 py-10 text-white">
      <div className="mx-auto max-w-md">
        <TipCard address={address} />
      </div>
    </main>
  );
}
