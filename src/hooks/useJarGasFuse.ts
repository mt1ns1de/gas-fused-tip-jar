import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PublicClient } from 'viem';
import { formatGwei } from 'viem';
import { TIPJAR_ABI } from '@/lib/abiTipJar';

type FuseBadge = {
  label: string;
  className: string;
  description: string;
};

type UseJarGasFuseResult = {
  jarCapGwei: number | null;
  netGasGwei: number | null;
  fuseRatio: number | null;
  fuseBadge: FuseBadge | null;
  refreshGas: (silent?: boolean) => Promise<void>;
};

export function useJarGasFuse(
  jar: `0x${string}`,
  publicClient: PublicClient | undefined,
): UseJarGasFuseResult {
  const [jarCapGwei, setJarCapGwei] = useState<number | null>(null);
  const [netGasGwei, setNetGasGwei] = useState<number | null>(null);

  const refreshGas = useCallback(
    async (silent = false) => {
      if (!publicClient) return;

      try {
        const [capWei, baseWei] = await Promise.all([
          publicClient.readContract({
            address: jar,
            abi: TIPJAR_ABI as any,
            functionName: 'maxGasPriceWei',
            args: [] as const,
          }),
          publicClient.getGasPrice(),
        ]);

        setJarCapGwei(Number(formatGwei(capWei as bigint)));
        setNetGasGwei(Number(formatGwei(baseWei)));
      } catch (e) {
        if (!silent) console.error('Gas panel refresh failed:', e);
      }
    },
    [jar, publicClient],
  );

  useEffect(() => {
    if (!publicClient) return;

    let alive = true;
    let idGas: ReturnType<typeof setInterval> | null = null;

    const run = async () => {
      try {
        await refreshGas(true);
      } catch {
        // ignore initial error
      }

      idGas = setInterval(() => {
        if (!alive) return;
        void refreshGas(true);
      }, 30_000);
    };

    void run();

    return () => {
      alive = false;
      if (idGas) clearInterval(idGas);
    };
  }, [publicClient, refreshGas]);

  const fuseRatio = useMemo(() => {
    if (
      jarCapGwei === null ||
      netGasGwei === null ||
      jarCapGwei <= 0 ||
      netGasGwei <= 0
    )
      return null;
    return jarCapGwei / netGasGwei;
  }, [jarCapGwei, netGasGwei]);

  const fuseBadge = useMemo<FuseBadge | null>(() => {
    if (!fuseRatio) return null;

    if (fuseRatio < 1) {
      return {
        label: 'Cap below gas',
        className:
          'border-amber-400/50 bg-amber-500/10 text-amber-100',
        description:
          'Gas is currently above this jar’s fuse cap. Some tips may revert until fees cool down.',
      };
    }

    if (fuseRatio <= 1.7) {
      return {
        label: 'Balanced fuse',
        className:
          'border-emerald-400/40 bg-emerald-500/10 text-emerald-100',
        description:
          'Fuse cap sits in a balanced zone. Supporters stay protected while tips usually go through.',
      };
    }

    return {
      label: 'Loose fuse',
      className: 'border-sky-400/40 bg-sky-500/10 text-sky-100',
      description:
        'Fuse cap is well above current gas. Tips are unlikely to fail on gas, but fees can be higher if gas spikes later.',
    };
  }, [fuseRatio]);

  return {
    jarCapGwei,
    netGasGwei,
    fuseRatio,
    fuseBadge,
    refreshGas,
  };
}
