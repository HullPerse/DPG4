import { rawDb } from "../db";
import { newId } from "./ids";
import { nowIso } from "./dates";
import { logger } from "./logger";

type Job = Record<string, unknown>;

export async function pushJob(queue: string, job: Job): Promise<void> {
  rawDb
    .prepare(
      "INSERT INTO jobs (id, queue, data, created_at) VALUES (?, ?, ?, ?)",
    )
    .run(newId(), queue, JSON.stringify(job), nowIso());
}

export async function popJob(
  queue: string,
  _timeout?: number,
): Promise<Job | null> {
  const row = rawDb
    .prepare(
      "SELECT id, data FROM jobs WHERE queue = ? ORDER BY created_at ASC LIMIT 1",
    )
    .get(queue) as { id: string; data: string } | undefined;

  if (!row) return null;

  rawDb.prepare("DELETE FROM jobs WHERE id = ?").run(row.id);
  return JSON.parse(row.data) as Job;
}

export function listenQueue(
  queue: string,
  handler: (job: Job) => Promise<void>,
): void {
  (async function poll() {
    while (true) {
      try {
        const job = await popJob(queue);
        if (job) await handler(job);
        else await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (err) {
        logger.error(null, `Queue ${queue} error`, err);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  })();
}
