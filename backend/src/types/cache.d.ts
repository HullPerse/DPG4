export type CacheValue =
  | string
  | number
  | boolean
  | null
  | Record<string, unknown>
  | unknown[];

export type CacheEntry = { value: CacheValue; expiresAt: number | null };
