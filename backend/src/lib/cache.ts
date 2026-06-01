import Redis from "ioredis";

type CacheValue = string | number | boolean | null | Record<string, unknown> | unknown[];

const memoryStore = new Map<string, { value: CacheValue; ttl: number; expiresAt: number }>();
let redis: Redis | null = null;
let redisAvailable = false;

function initRedis(): Redis | null {
  if (redis) return redis;
  try {
    redis = new Redis({
      host: Bun.env.REDIS_HOST || "127.0.0.1",
      port: Number(Bun.env.REDIS_PORT) || 6379,
      lazyConnect: true,
      maxRetriesPerRequest: 0,
      retryStrategy: () => null,
    });
    redis.on("error", () => {
      redisAvailable = false;
    });
    redis.on("ready", () => {
      redisAvailable = true;
    });
    redis.connect().catch(() => {
      redisAvailable = false;
    });
    return redis;
  } catch {
    redisAvailable = false;
    return null;
  }
}

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
  if (r && redisAvailable) {
    try {
      const raw = await r.get(key);
      if (raw === null || raw === undefined) return null;
      return deserialize(raw) as T;
    } catch {
      redisAvailable = false;
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
  if (r && redisAvailable) {
    try {
      const raw = serialize(value);
      await r.set(key, raw, "PX", ttlMs);
      return;
    } catch {
      redisAvailable = false;
    }
  }

  memoryStore.set(key, { value, ttl: ttlMs, expiresAt: now() + ttlMs });
}

export async function cacheDel(key: string): Promise<void> {
  const r = initRedis();
  if (r && redisAvailable) {
    try {
      await r.del(key);
    } catch {
      redisAvailable = false;
    }
  }
  memoryStore.delete(key);
}

export async function cacheFlush(): Promise<void> {
  const r = initRedis();
  if (r && redisAvailable) {
    try {
      await r.flushdb();
    } catch {
      redisAvailable = false;
    }
  }
  memoryStore.clear();
}

export function isRedisAvailable(): boolean {
  return redisAvailable;
}

export async function checkRedis(): Promise<boolean> {
  const r = initRedis();
  if (!r) return false;
  try {
    await r.ping();
    redisAvailable = true;
    return true;
  } catch {
    redisAvailable = false;
    return false;
  }
}
