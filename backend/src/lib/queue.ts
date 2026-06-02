import { logger } from "./logger";
import { initRedis, isRedisAvailable, setRedisAvailable } from "./redis.client";

type Job = Record<string, unknown>;

const memoryQueues = new Map<string, Job[]>();
const memoryListeners = new Map<string, Set<(job: Job) => Promise<void>>>();

function parseBrpopResult(result: unknown): string | null {
  if (!result) return null;
  if (Array.isArray(result) && typeof result[1] === "string") return result[1];
  if (typeof result === "object" && result !== null && "element" in result) {
    const element = (result as { element: unknown }).element;
    return typeof element === "string" ? element : null;
  }
  return null;
}

export async function pushJob(queue: string, job: Job): Promise<void> {
  const r = initRedis();
  if (r && isRedisAvailable()) {
    try {
      await r.lpush(queue, JSON.stringify(job));
      return;
    } catch {
      setRedisAvailable(false);
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
  const r = initRedis();
  if (r && isRedisAvailable()) {
    try {
      const result = await r.brpop(queue, timeout);
      const raw = parseBrpopResult(result);
      if (raw) return JSON.parse(raw) as Job;
      return null;
    } catch {
      setRedisAvailable(false);
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
  const r = initRedis();
  if (r && isRedisAvailable()) {
    (async function poll() {
      while (true) {
        try {
          const job = await popJob(queue, 0);
          if (job) await handler(job);
          else await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (err) {
          logger.error(null, `Queue ${queue} error`, err);
          await new Promise((resolve) => setTimeout(resolve, 1000));
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
