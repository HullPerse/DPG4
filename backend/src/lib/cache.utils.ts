import type { CacheValue, CacheEntry } from "@/types/cache";

const store = new Map<string, CacheEntry>();
const KEY_ORDER: string[] = [];
const MAX_SIZE = 500;

function touchKey(key: string) {
  const idx = KEY_ORDER.indexOf(key);
  if (idx > -1) KEY_ORDER.splice(idx, 1);
  KEY_ORDER.push(key);
}

function evictIfNeeded() {
  while (KEY_ORDER.length > MAX_SIZE) {
    const oldest = KEY_ORDER.shift();
    if (oldest) store.delete(oldest);
  }
}

export async function cacheGet<T extends CacheValue>(
  key: string,
): Promise<T | null> {
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
    store.delete(key);
    const idx = KEY_ORDER.indexOf(key);
    if (idx > -1) KEY_ORDER.splice(idx, 1);
    return null;
  }
  touchKey(key);
  return entry.value as T;
}

export async function cacheSet(
  key: string,
  value: CacheValue,
  ttlMs: number,
): Promise<void> {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
  touchKey(key);
  evictIfNeeded();
}

export async function cacheDel(key: string): Promise<void> {
  store.delete(key);
  const idx = KEY_ORDER.indexOf(key);
  if (idx > -1) KEY_ORDER.splice(idx, 1);
}

export async function cacheClear(pattern?: string): Promise<void> {
  if (!pattern) {
    store.clear();
    KEY_ORDER.length = 0;
    return;
  }
  for (const key of store.keys()) {
    if (key.includes(pattern)) {
      store.delete(key);
      const idx = KEY_ORDER.indexOf(key);
      if (idx > -1) KEY_ORDER.splice(idx, 1);
    }
  }
}
