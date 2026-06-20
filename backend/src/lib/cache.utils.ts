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

export async function cacheFlush(): Promise<void> {
  store.clear();
}

export async function sweepExpiredCache(): Promise<number> {
  const now = Date.now();
  let deleted = 0;
  for (const [key, entry] of store) {
    if (entry.expiresAt !== null && now > entry.expiresAt) {
      store.delete(key);
      deleted++;
    }
  }
  return deleted;
}
