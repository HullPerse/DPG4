import { RedisClient } from "bun";

let redis: RedisClient | null = null;
let redisAvailable = false;

export function getRedisUrl(): string {
  if (Bun.env.REDIS_URL) return Bun.env.REDIS_URL;
  const host = Bun.env.REDIS_HOST || "127.0.0.1";
  const port = Bun.env.REDIS_PORT || "6379";
  return `redis://${host}:${port}`;
}

export function initRedis(): RedisClient | null {
  if (redis) return redis;
  try {
    redis = new RedisClient(getRedisUrl(), {
      autoReconnect: false,
      connectionTimeout: 3000,
      maxRetries: 0,
    });
    redis.onclose = () => {
      redisAvailable = false;
    };
    redis.onconnect = () => {
      redisAvailable = true;
    };
    void redis.ping().then(
      () => {
        redisAvailable = true;
      },
      () => {
        redisAvailable = false;
      },
    );
    return redis;
  } catch {
    redisAvailable = false;
    return null;
  }
}

export function isRedisAvailable(): boolean {
  return redisAvailable;
}

export function setRedisAvailable(available: boolean): void {
  redisAvailable = available;
}
