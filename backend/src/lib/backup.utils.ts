import { mkdir, readdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { config } from "@/server.config";
import { resolveBackendPath } from "@/lib/path.utils";
import { rawDb } from "@/db/index.db";
import Logger from "@/lib/logger.utils";
import type { Tracker } from "@/types/server";

const logger = new Logger("BACKUP");
const TRACKER_PATH = resolveBackendPath("data", "backup-tracker.json");
const BACKUP_DIR = resolveBackendPath("backups");
const INTERVAL_MS = 5 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_AUTO_BACKUPS = 5;

async function readTracker(): Promise<Tracker> {
  try {
    const raw = await Bun.file(TRACKER_PATH).text();
    return JSON.parse(raw) as Tracker;
  } catch {
    return { lastBackup: null };
  }
}

async function writeTracker(tracker: Tracker) {
  await mkdir(resolveBackendPath("data"), { recursive: true });
  await Bun.write(TRACKER_PATH, JSON.stringify(tracker, null, 2));
}

async function rotateAutoBackups() {
  try {
    const files = await readdir(BACKUP_DIR);
    const autoBackups = files
      .filter((f) => f.startsWith("auto-db-") && f.endsWith(".sqlite"))
      .sort()
      .reverse();

    if (autoBackups.length > MAX_AUTO_BACKUPS) {
      for (const file of autoBackups.slice(MAX_AUTO_BACKUPS)) {
        await unlink(join(BACKUP_DIR, file));
        logger.info(`Removed old auto-backup: ${file}`);
      }
    }
  } catch (err) {
    logger.error(
      `Auto-backup rotation failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

async function doBackup(): Promise<boolean> {
  try {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    if (!(await Bun.file(config.dbPath).exists())) {
      logger.warn(
        `Auto-backup skipped: database file not found ${config.dbPath}`,
      );
      return false;
    }
    await mkdir(BACKUP_DIR, { recursive: true });
    const filename = `auto-db-${stamp}.sqlite`;
    const dest = join(BACKUP_DIR, filename);
    const escapedDest = dest.replace(/'/g, "''");
    rawDb.exec(`VACUUM INTO '${escapedDest}'`);
    await writeTracker({ lastBackup: new Date().toISOString() });
    await rotateAutoBackups();
    logger.info(`Auto-backup saved: ${dest}`);
    return true;
  } catch (err) {
    logger.error(
      `Auto-backup failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return false;
  }
}

async function checkAndBackup(): Promise<boolean> {
  const tracker = await readTracker();
  if (!tracker.lastBackup) return doBackup();
  const elapsed = Date.now() - new Date(tracker.lastBackup).getTime();
  if (elapsed >= DAY_MS) return doBackup();
  return false;
}

export function initAutoBackup() {
  checkAndBackup();
  setInterval(checkAndBackup, INTERVAL_MS);
  logger.info("Auto-backup scheduled (every 5 min check, 24h threshold)");
}
