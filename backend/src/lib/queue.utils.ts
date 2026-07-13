import { rawDb } from "@/db/index.db";
import { newId, nowIso } from "@/lib/index.utils";
import Logger from "@/lib/logger.utils";

const logger = new Logger("QUEUE");

const TABLE = "__jobs";

export function initJobQueue() {
  rawDb.run(`
    CREATE TABLE IF NOT EXISTS ${TABLE} (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      payload TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'pending',
      created TEXT NOT NULL,
      started TEXT,
      completed TEXT
    )
  `);
  rawDb.run(`CREATE INDEX IF NOT EXISTS idx_jobs_status ON ${TABLE} (status)`);
}

export function enqueue(type: string, payload: Record<string, unknown> = {}) {
  rawDb
    .prepare(
      `INSERT INTO ${TABLE} (id, type, payload, status, created) VALUES (?, ?, ?, 'pending', ?)`,
    )
    .run(newId(), type, JSON.stringify(payload), nowIso());
}

export function pollJob() {
  const job = rawDb
    .prepare(
      `UPDATE ${TABLE} SET status = 'running', started = ? WHERE id = (
        SELECT id FROM ${TABLE} WHERE status = 'pending' ORDER BY created ASC LIMIT 1
      ) RETURNING *`,
    )
    .get(nowIso()) as
    | { id: string; type: string; payload: string; started: string }
    | undefined;

  if (!job) return null;

  return {
    id: job.id,
    type: job.type,
    payload: JSON.parse(job.payload) as Record<string, unknown>,
    started: job.started,
  };
}

export function completeJob(id: string) {
  rawDb
    .prepare(
      `UPDATE ${TABLE} SET status = 'done', completed = ? WHERE id = ?`,
    )
    .run(nowIso(), id);
  logger.info(`Job ${id} completed`);
}

export function failJob(id: string, error: string) {
  rawDb
    .prepare(
      `UPDATE ${TABLE} SET status = 'failed', completed = ? WHERE id = ?`,
    )
    .run(nowIso(), id);
  logger.error(`Job ${id} failed: ${error}`);
}

export function processQueue(handler: (job: { type: string; payload: Record<string, unknown> }) => Promise<void>) {
  const interval = setInterval(async () => {
    const job = pollJob();
    if (!job) return;

    try {
      await handler(job);
      completeJob(job.id);
    } catch (err) {
      failJob(job.id, err instanceof Error ? err.message : String(err));
    }
  }, 2000);

  return () => clearInterval(interval);
}
