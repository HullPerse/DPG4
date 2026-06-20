import { mkdir, copyFile } from "node:fs/promises";
import { join } from "node:path";
import { config } from "../src/server.config";
import { resolveBackendPath } from "@/lib/path.utils";

const nameIndex = process.argv.indexOf("--name");
const customName =
  nameIndex !== -1 && nameIndex + 1 < process.argv.length
    ? process.argv[nameIndex + 1]
    : null;

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = resolveBackendPath("backups");
const filename = customName ? `${customName}.sqlite` : `db-${stamp}.sqlite`;
const dest = join(backupDir, filename);

await mkdir(backupDir, { recursive: true });
await copyFile(config.dbPath, dest);

console.log(`Backup saved: ${dest}`);
