import { copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { config } from "../src/server.config";
import { resolveBackendPath } from "../src/lib/paths";

const backupName = process.argv[2];
if (!backupName) {
  console.error("Usage: bun db:restore <backup-filename>");
  console.error("Example: bun db:restore db-2026-05-30T12-00-00-000Z.sqlite");
  process.exit(1);
}

const backupDir = resolveBackendPath("backups");
const backupPath = join(backupDir, backupName);
const dbPath = config.dbPath;

if (!existsSync(backupPath)) {
  console.error(`Backup not found: ${backupPath}`);
  process.exit(1);
}

const rl = readline.createInterface({ input, output });
const answer = await rl.question(
  `WARNING: This will REPLACE ${dbPath} with ${backupPath}.\n` +
    `This action CANNOT be undone.\n` +
    `Type "y" to confirm: `,
);
rl.close();

if (answer.trim().toLowerCase() !== "y") {
  console.log("Restore cancelled.");
  process.exit(0);
}

await copyFile(backupPath, dbPath);
console.log(`Database restored from: ${backupPath}`);
