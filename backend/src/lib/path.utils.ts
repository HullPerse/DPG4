 import { join } from "node:path";

/**
 * Backend project root (package.json, data/, logs/, backups/).
 * Walks up from import.meta.dir until it finds a directory with package.json.
 */
 const BACKEND_ROOT = (() => {
   let dir = import.meta.dir;
   while (dir) {
     try {
       if (Bun.file(join(dir, "package.json")).size > 0) return dir;
     } catch {}
     const parent = join(dir, "..");
     if (parent === dir) break;
     dir = parent;
   }
   return import.meta.dir;
 })();

 export function resolveBackendPath(...segments: string[]): string {
   return join(BACKEND_ROOT, ...segments);
 }
