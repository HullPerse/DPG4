import { mkdir, copyFile } from "node:fs/promises";
import { join } from "node:path";
import { config } from "../config";
import { logger } from "./logger";

const TRACKER_PATH = join(import.meta.dir, "..", "..", "data", "backup-tracker.json");
const BACKUP_DIR = join(import.meta.dir, "..", "..", "backups");
const INTERVAL_MS = 5 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

interface Tracker {
  lastBackup: string | null;
}

async function readTracker(): Promise<Tracker> {
  try {
    const raw = await Bun.file(TRACKER_PATH).text();
    return JSON.parse(raw) as Tracker;
  } catch {
    return { lastBackup: null };
  }
}

async function writeTracker(tracker: Tracker) {
  await mkdir(join(import.meta.dir, "..", "..", "data"), { recursive: true });
  await Bun.write(TRACKER_PATH, JSON.stringify(tracker, null, 2));
}

async function doBackup(): Promise<boolean> {
  try {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const dbPath = config.dbPath;
    if (!(await Bun.file(dbPath).exists())) {
      logger.warn(null, "Auto-backup skipped: database file not found", dbPath);
      return false;
    }
    await mkdir(BACKUP_DIR, { recursive: true });
    const dest = join(BACKUP_DIR, `db-${stamp}.sqlite`);
    await copyFile(dbPath, dest);
    await writeTracker({ lastBackup: new Date().toISOString() });
    logger.info(null, `Auto-backup saved: ${dest}`);
    return true;
  } catch (err) {
    logger.error(null, "Auto-backup failed", err instanceof Error ? err.message : String(err));
    return false;
  }
}

export async function checkAndBackup(): Promise<boolean> {
  const tracker = await readTracker();
  if (!tracker.lastBackup) {
    return doBackup();
  }
  const elapsed = Date.now() - new Date(tracker.lastBackup).getTime();
  if (elapsed >= DAY_MS) {
    return doBackup();
  }
  return false;
}

let intervalId: ReturnType<typeof setInterval> | null = null;

export function initAutoBackup() {
  checkAndBackup();
  intervalId = setInterval(checkAndBackup, INTERVAL_MS);
  logger.info(null, "Auto-backup scheduled (every 5 min check, 24h threshold)");
}

export function stopAutoBackup() {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
