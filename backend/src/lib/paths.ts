import { basename, join } from "node:path";

/**
 * Backend project root (package.json, data/, logs/, backups/).
 * - From source: this file lives in src/ → one level up.
 * - From bundle (backend/server): import.meta.dir is already the root.
 */
export const BACKEND_ROOT =
  basename(import.meta.dir) === "src"
    ? join(import.meta.dir, "..")
    : import.meta.dir;

export function resolveBackendPath(...segments: string[]): string {
  return join(BACKEND_ROOT, ...segments);
}
