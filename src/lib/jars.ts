// src/lib/jars.ts
export type JarEntry = {
  address: `0x${string}` | string;
  name: string;
  createdAt: number;
};

const STORAGE_KEY = "gftj:jars";

export function loadJars(): JarEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as JarEntry[];
    if (!Array.isArray(list)) return [];
    const map = new Map<string, JarEntry>();
    for (const j of list) if (j?.address) map.set(j.address.toLowerCase(), j);
    return Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export function saveJars(jars: JarEntry[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(jars));
}

export function upsertJar(entry: JarEntry) {
  const list = loadJars();
  const idx = list.findIndex(j => j.address.toLowerCase() === entry.address.toLowerCase());
  if (idx >= 0) list[idx] = { ...list[idx], ...entry };
  else list.unshift(entry);
  saveJars(list);
}

export function removeJar(address: string) {
  const list = loadJars().filter(j => j.address.toLowerCase() !== address.toLowerCase());
  saveJars(list);
}

export function renameJar(address: string, name: string) {
  const list = loadJars();
  const idx = list.findIndex(j => j.address.toLowerCase() === address.toLowerCase());
  if (idx >= 0) {
    list[idx].name = name;
    saveJars(list);
  }
}
