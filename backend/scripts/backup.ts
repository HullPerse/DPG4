import { mkdir, copyFile } from "node:fs/promises";
import { join } from "node:path";
import { config } from "../src/config";

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = join(process.cwd(), "backups");
const dest = join(backupDir, `db-${stamp}.sqlite`);

await mkdir(backupDir, { recursive: true });
await copyFile(config.dbPath, dest);

console.log(`Backup saved: ${dest}`);
