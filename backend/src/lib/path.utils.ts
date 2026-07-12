 import { join } from "node:path";

/**
 * Backend project root (package.json, data/, logs/, backups/).
 * First checks BACKEND_ROOT env var, then walks up from import.meta.dir,
 * and finally falls back to process.cwd() for production (compiled binary).
 */
 const BACKEND_ROOT = (() => {
   if (Bun.env.BACKEND_ROOT) return Bun.env.BACKEND_ROOT;
   let dir = import.meta.dir;
   while (dir) {
     try {
       if (Bun.file(join(dir, "package.json")).size > 0) return dir;
     } catch {}
     const parent = join(dir, "..");
     if (parent === dir) break;
     dir = parent;
   }
   return process.cwd();
 })();

 export function resolveBackendPath(...segments: string[]): string {
   return join(BACKEND_ROOT, ...segments);
 }
