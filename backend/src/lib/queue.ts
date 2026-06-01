import Redis from "ioredis";
import { logger } from "./logger";

type Job = Record<string, unknown>;

const memoryQueues = new Map<string, Job[]>();
const memoryListeners = new Map<string, Set<(job: Job) => Promise<void>>>();

let redis: Redis | null = null;
let redisAvailable = false;

function getRedis(): Redis | null {
  if (redis) return redis;
  try {
    redis = new Redis({
      host: Bun.env.REDIS_HOST || "127.0.0.1",
      port: Number(Bun.env.REDIS_PORT) || 6379,
      lazyConnect: true,
      maxRetriesPerRequest: 0,
      retryStrategy: () => null,
    });
    redis.on("error", () => { redisAvailable = false; });
    redis.on("ready", () => { redisAvailable = true; });
    redis.connect().catch(() => { redisAvailable = false; });
    return redis;
  } catch {
    redisAvailable = false;
    return null;
  }
}

export async function pushJob(queue: string, job: Job): Promise<void> {
  const r = getRedis();
  if (r && redisAvailable) {
    try {
      await r.lpush(queue, JSON.stringify(job));
      return;
    } catch {
      redisAvailable = false;
    }
  }
  const mq = memoryQueues.get(queue) ?? [];
  mq.push(job);
  memoryQueues.set(queue, mq);
  const listeners = memoryListeners.get(queue);
  if (listeners) {
    for (const listener of listeners) {
      listener(job).catch((err) => logger.error(null, "Queue job error", err));
    }
  }
}

export async function popJob(queue: string, timeout = 0): Promise<Job | null> {
  const r = getRedis();
  if (r && redisAvailable) {
    try {
      const result = await r.brpop(queue, timeout);
      if (result) return JSON.parse(result[1]) as Job;
      return null;
    } catch {
      redisAvailable = false;
    }
  }
  const mq = memoryQueues.get(queue);
  if (!mq || mq.length === 0) return null;
  return mq.shift() ?? null;
}

export function listenQueue(
  queue: string,
  handler: (job: Job) => Promise<void>,
): void {
  const r = getRedis();
  if (r && redisAvailable) {
    (async function poll() {
      while (true) {
        try {
          const job = await popJob(queue, 0);
          if (job) await handler(job);
          else await new Promise((r) => setTimeout(r, 1000));
        } catch (err) {
          logger.error(null, `Queue ${queue} error`, err);
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    })();
    return;
  }
  const listeners = memoryListeners.get(queue) ?? new Set();
  listeners.add(handler);
  memoryListeners.set(queue, listeners);
  const mq = memoryQueues.get(queue);
  if (mq) {
    const jobs = [...mq];
    mq.length = 0;
    for (const job of jobs) {
      handler(job).catch((err) => logger.error(null, "Queue job error", err));
    }
  }
}
