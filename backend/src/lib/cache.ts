import { rawDb } from "../db";

type CacheValue =
  | string
  | number
  | boolean
  | null
  | Record<string, unknown>
  | unknown[];

function serialize(value: CacheValue): string {
  return JSON.stringify(value);
}

function deserialize<T extends CacheValue>(raw: string): T {
  return JSON.parse(raw) as T;
}

export async function cacheGet<T extends CacheValue>(
  key: string,
): Promise<T | null> {
  const row = rawDb
    .prepare("SELECT value, expires_at FROM cache WHERE key = ?")
    .get(key) as { value: string; expires_at: number | null } | undefined;

  if (!row) return null;

  if (row.expires_at && Date.now() > row.expires_at) {
    rawDb.prepare("DELETE FROM cache WHERE key = ?").run(key);
    return null;
  }

  return deserialize<T>(row.value);
}

export async function cacheSet(
  key: string,
  value: CacheValue,
  ttlMs: number,
): Promise<void> {
  const expiresAt = Date.now() + ttlMs;
  const raw = serialize(value);
  rawDb
    .prepare(
      "INSERT OR REPLACE INTO cache (key, value, expires_at) VALUES (?, ?, ?)",
    )
    .run(key, raw, expiresAt);
}

export async function cacheDel(key: string): Promise<void> {
  rawDb.prepare("DELETE FROM cache WHERE key = ?").run(key);
}

export async function cacheFlush(): Promise<void> {
  rawDb.prepare("DELETE FROM cache").run();
}

export async function sweepExpiredCache(): Promise<number> {
  const { changes } = rawDb
    .prepare("DELETE FROM cache WHERE expires_at IS NOT NULL AND expires_at <= ?")
    .run(Date.now());
  return changes;
}
