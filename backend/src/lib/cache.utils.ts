import type { CacheValue, CacheEntry } from "@/types/cache";

const store = new Map<string, CacheEntry>();

export async function cacheGet<T extends CacheValue>(
  key: string,
): Promise<T | null> {
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
}

export async function cacheSet(
  key: string,
  value: CacheValue,
  ttlMs: number,
): Promise<void> {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export async function cacheDel(key: string): Promise<void> {
  store.delete(key);
}
