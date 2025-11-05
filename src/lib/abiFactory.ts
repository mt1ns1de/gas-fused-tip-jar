// src/lib/abiFactory.ts
/**
 * Берём ABI из ENV (NEXT_PUBLIC_FACTORY_ABI) — одной строкой JSON.
 * Если нет — бросаем ошибку, чтобы не было тихих падений.
 */
export async function getFactoryAbi(): Promise<any[]> {
  const raw = process.env.NEXT_PUBLIC_FACTORY_ABI;
  if (!raw) throw new Error("NEXT_PUBLIC_FACTORY_ABI is not set");
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    throw new Error("Factory ABI must be a JSON array");
  } catch (e) {
    throw new Error("Failed to parse NEXT_PUBLIC_FACTORY_ABI");
  }
}
