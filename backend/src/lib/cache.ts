import {
  initRedis,
  isRedisAvailable,
  setRedisAvailable,
} from "./redis.client";

type CacheValue = string | number | boolean | null | Record<string, unknown> | unknown[];

const memoryStore = new Map<string, { value: CacheValue; ttl: number; expiresAt: number }>();

function serialize(value: CacheValue): string {
  return JSON.stringify(value);
}

function deserialize(raw: string): CacheValue {
  try {
    return JSON.parse(raw) as CacheValue;
  } catch {
    return raw;
  }
}

function now(): number {
  return Date.now();
}

export async function cacheGet<T extends CacheValue>(key: string): Promise<T | null> {
  const r = initRedis();
  if (r && isRedisAvailable()) {
    try {
      const raw = await r.get(key);
      if (raw === null) return null;
      return deserialize(raw) as T;
    } catch {
      setRedisAvailable(false);
    }
  }

  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (now() > entry.expiresAt) {
    memoryStore.delete(key);
    return null;
  }
  return entry.value as T;
}

export async function cacheSet(key: string, value: CacheValue, ttlMs: number): Promise<void> {
  const r = initRedis();
  if (r && isRedisAvailable()) {
    try {
      const raw = serialize(value);
      await r.psetex(key, ttlMs, raw);
      return;
    } catch {
      setRedisAvailable(false);
    }
  }

  memoryStore.set(key, { value, ttl: ttlMs, expiresAt: now() + ttlMs });
}

export async function cacheDel(key: string): Promise<void> {
  const r = initRedis();
  if (r && isRedisAvailable()) {
    try {
      await r.del(key);
    } catch {
      setRedisAvailable(false);
    }
  }
  memoryStore.delete(key);
}

export async function cacheFlush(): Promise<void> {
  const r = initRedis();
  if (r && isRedisAvailable()) {
    try {
      await r.send("FLUSHDB", []);
    } catch {
      setRedisAvailable(false);
    }
  }
  memoryStore.clear();
}

export { isRedisAvailable };

export async function checkRedis(): Promise<boolean> {
  const r = initRedis();
  if (!r) return false;
  try {
    await r.ping();
    setRedisAvailable(true);
    return true;
  } catch {
    setRedisAvailable(false);
    return false;
  }
}
