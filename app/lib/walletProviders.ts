"use client";

/**
 * Утилиты для работы с инжектированными провайдерами (Rabby / MetaMask).
 * Корректно обрабатывают window.ethereum.providers (несколько провайдеров в браузере).
 */

export type ProviderId = "rabby" | "metamask";
export interface InjectedDescriptor {
  id: ProviderId;
  label: string;
  // сырой EIP-1193 провайдер
  provider: any;
}

function asArray<T>(x: T | T[] | undefined | null): T[] {
  if (!x) return [];
  return Array.isArray(x) ? x : [x];
}

export function getInjectedProviders(): InjectedDescriptor[] {
  if (typeof window === "undefined") return [];

  const eth: any = (window as any).ethereum;
  if (!eth) return [];

  const candidates = new Set<any>([eth, ...asArray(eth.providers)]);

  const out: InjectedDescriptor[] = [];
  for (const p of candidates) {
    if (!p) continue;

    // Rabby помечает себя isRabby = true
    if (p.isRabby) {
      out.push({ id: "rabby", label: "Rabby Wallet", provider: p });
      continue;
    }

    // MetaMask помечает isMetaMask = true (и не является Rabby)
    if (p.isMetaMask && !p.isRabby) {
      out.push({ id: "metamask", label: "MetaMask", provider: p });
      continue;
    }
  }

  // Убираем дубликаты одного и того же экземпляра
  const uniq = new Map<any, InjectedDescriptor>();
  for (const d of out) uniq.set(d.provider, d);
  return [...uniq.values()];
}

export function selectDefaultProvider(): InjectedDescriptor[] {
  // Возвращаем список (0, 1 или 2). Если 1 — можно подключаться без модалки.
  return getInjectedProviders();
}

export function getProviderById(id: ProviderId): InjectedDescriptor | null {
  const list = getInjectedProviders();
  return list.find((d) => d.id === id) ?? null;
}

export function installationLinks() {
  return {
    rabby: "https://rabby.io",
    metamask: "https://metamask.io/download/"
  };
}
