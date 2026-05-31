import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { eq } from "drizzle-orm";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import * as schema from "../db/schema";
import { config } from "../config";
import { dbPlugin } from "../plugins/db.plugin";
import { newId } from "../lib/ids";
import { nowIso } from "../lib/dates";
import {
  ADMIN_BLOB_FIELDS,
  ADMIN_JSON_FIELDS,
  getAdminSchemaPayload,
} from "../lib/adminSchema";
import { getAdminStats, listAdminRows } from "../lib/adminQuery";
import { adminTableColumn, getAdminTable } from "../lib/adminTables";
import { broadcast, broadcastAdminReload } from "../lib/ws";
import { logger, LOG_FILE } from "../lib/logger";
import { addInventory } from "../services/economy.service";

const BROADCAST_TABLES = new Set([
  "users",
  "games",
  "presets",
  "items",
  "inventory",
  "market",
  "activity",
  "chats",
  "rules",
  "ads",
  "drawings",
  "cells",
]);

function isBlobPlaceholder(val: unknown): boolean {
  return typeof val === "string" && val.includes("[buffer");
}

function maybeBroadcast(table: string, action: string, id: string) {
  if (BROADCAST_TABLES.has(table)) broadcast(table, action, id);
}

const hasTimestamps = new Set([
  "users",
  "games",
  "presets",
  "items",
  "inventory",
  "market",
  "chats",
  "rules",
  "ads",
  "drawings",
  "cells",
]);

function tryParseJson(v: unknown): unknown {
  if (typeof v !== "string") return v;
  const trimmed = v.trim();
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return v;
    }
  }
  return v;
}

function parseDataUrl(value: string): { buffer: Buffer; mime: string } | null {
  const match = value.match(/^data:(.+?);base64,(.+)$/);
  if (!match) return null;
  return { mime: match[1], buffer: Buffer.from(match[2], "base64") };
}

async function cleanBody(
  body: Record<string, unknown>,
  tbl: string,
): Promise<Record<string, unknown>> {
  const jf = ADMIN_JSON_FIELDS[tbl] ?? [];
  const bf = ADMIN_BLOB_FIELDS[tbl] ?? [];
  const out: Record<string, unknown> = {};
  let plainPassword: string | undefined;

  for (const [k, v] of Object.entries(body)) {
    if (k === "password") {
      if (typeof v === "string" && v.trim()) plainPassword = v.trim();
      continue;
    }
    if ((k === "id" || k === "passwordHash") && !v) continue;
    if (k === "collectionId" || k === "collectionName") continue;
    out[k] = jf.includes(k) ? tryParseJson(v) : v;
  }

  if (tbl === "users" && plainPassword) {
    out.passwordHash = await Bun.password.hash(plainPassword);
  }

  for (const { field, mimeField } of bf) {
    const val = out[field];
    if (typeof val === "string" && val.startsWith("data:")) {
      const parsed = parseDataUrl(val);
      if (parsed) {
        out[field] = parsed.buffer;
        out[mimeField] = parsed.mime;
      }
    } else if (typeof val === "string" && val === "") {
      delete out[field];
      delete out[mimeField];
    } else if (isBlobPlaceholder(val)) {
      delete out[field];
      delete out[mimeField];
    }
  }
  return out;
}

function sanitizePath(p: string): string {
  return p
    .replace(/\.\.\//g, "")
    .replace(/\.\.\\/g, "")
    .replaceAll("\0", "");
}

function mimeType(fp: string): string {
  if (fp.endsWith(".js")) return "application/javascript";
  if (fp.endsWith(".css")) return "text/css";
  if (fp.endsWith(".html")) return "text/html";
  if (fp.endsWith(".json")) return "application/json";
  if (fp.endsWith(".svg")) return "image/svg+xml";
  if (fp.endsWith(".png")) return "image/png";
  if (fp.endsWith(".jpg") || fp.endsWith(".jpeg")) return "image/jpeg";
  if (fp.endsWith(".webp")) return "image/webp";
  if (fp.endsWith(".ico")) return "image/x-icon";
  if (fp.endsWith(".woff2")) return "font/woff2";
  if (fp.endsWith(".woff")) return "font/woff";
  if (fp.endsWith(".ttf")) return "font/ttf";
  return "application/octet-stream";
}

function replaceBuffers(row: Record<string, unknown>): void {
  for (const [k, v] of Object.entries(row)) {
    if (Buffer.isBuffer(v)) {
      (row as Record<string, string>)[k] = `[buffer ${v.length}b]`;
    }
  }
}

type AdminJwtPayload = { sub: string; role?: string };

async function verifyAdmin(
  headers: Record<string, string | undefined>,
  adminJwt: { verify: (t: string) => Promise<false | AdminJwtPayload> },
  db: any,
): Promise<{ id: string; username: string } | null> {
  const h = headers.authorization;
  const token = h?.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return null;
  const p = await adminJwt.verify(token);
  if (!p || typeof p.sub !== "string") return null;
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, p.sub));
  if (!user || !user.isAdmin) return null;
  return { id: user.id, username: user.username };
}

export const adminRoute = new Elysia()
  .use(dbPlugin)
  .use(jwt({ name: "adminJwt", secret: config.jwtSecret, exp: "24h" }))
  .group("/api/admin", (app) =>
    app
      .post(
        "/auth",
        async ({ body, db, adminJwt }) => {
          const username = body.username.toUpperCase();
          const [user] = await db
            .select()
            .from(schema.users)
            .where(eq(schema.users.username, username));
          if (!user || !user.isAdmin) {
            return new Response(
              JSON.stringify({ error: "Invalid credentials" }),
              { status: 401, headers: { "Content-Type": "application/json" } },
            );
          }
          const valid = await Bun.password.verify(
            body.password,
            user.passwordHash,
          );
          if (!valid) {
            return new Response(
              JSON.stringify({ error: "Invalid credentials" }),
              { status: 401, headers: { "Content-Type": "application/json" } },
            );
          }
          const token = await adminJwt.sign({ sub: user.id, role: "admin" });
          logger.info(user.username, "admin logged in");
          return {
            token,
            user: { id: user.id, username: user.username },
          };
        },
        { body: t.Object({ username: t.String(), password: t.String() }) },
      )

      .get("/verify", async ({ headers, adminJwt, db }) => {
        const admin = await verifyAdmin(headers, adminJwt, db);
        if (!admin) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
        return { ok: true, ...admin };
      })

      .get("/schema", () => getAdminSchemaPayload())

      .get("/stats", async ({ headers, adminJwt, db, set }) => {
        if (!(await verifyAdmin(headers, adminJwt, db))) {
          set.status = 401;
          return { error: "Unauthorized" };
        }
        return { counts: await getAdminStats(db) };
      })

      .post("/broadcast-reload", async ({ headers, adminJwt, db, set }) => {
          const admin = await verifyAdmin(headers, adminJwt, db);
          if (!admin) {
            set.status = 401;
            return { error: "Unauthorized" };
          }
          broadcastAdminReload();
          logger.info(admin.username, "admin broadcast reload");
          return { ok: true };
        })

      .post(
        "/grant-item",
        async ({ body, db, headers, adminJwt, set }) => {
          const admin = await verifyAdmin(headers, adminJwt, db);
          if (!admin) {
            set.status = 401;
            return { error: "Unauthorized" };
          }
          const ok = await addInventory(db, body.userId, body.itemId);
          if (!ok) {
            set.status = 400;
            return { error: "User or item not found" };
          }
          logger.info(admin.username, "admin granted item", `user:${body.userId}`, `item:${body.itemId}`);
          return { ok: true };
        },
        {
          body: t.Object({
            userId: t.String(),
            itemId: t.String(),
          }),
        },
      )

      .get("/logs", async ({ headers, adminJwt, db, set, query }) => {
        const admin = await verifyAdmin(headers, adminJwt, db);
        if (!admin) {
          set.status = 401;
          return { error: "Unauthorized" };
        }

        if (!existsSync(LOG_FILE)) {
          return { lines: [], total: 0 };
        }

        const raw = await readFile(LOG_FILE, "utf-8");
        const allLines = raw.trim().split("\n").filter(Boolean).reverse();

        const linesMax = Math.min(Math.max(Number(query.lines) || 100, 1), 5000);
        const offset = Math.max(Number(query.offset) || 0, 0);
        const search = (query.search ?? "").trim().toLowerCase();

        const filtered = search
          ? allLines.filter((line) => line.toLowerCase().includes(search))
          : allLines;

        const page = filtered.slice(offset, offset + linesMax);
        const parsed = page.map((line) => {
          try {
            return JSON.parse(line);
          } catch {
            return { t: null, l: null, u: null, m: line, d: [] };
          }
        });

        return { lines: parsed, total: filtered.length };
      })

      .post(
        "/exec",
        async ({ body, headers, adminJwt, db, set }) => {
          const admin = await verifyAdmin(headers, adminJwt, db);
          if (!admin) {
            set.status = 401;
            return { error: "Unauthorized" };
          }

          const proc = Bun.spawn(["cmd", "/c", body.command], {
            stdio: ["ignore", "pipe", "pipe"],
          });

          const timeout = setTimeout(() => {
            proc.kill();
          }, 30_000);

          const stdout = await new Response(proc.stdout).text();
          const stderr = await new Response(proc.stderr).text();
          const exitCode = await proc.exited;
          clearTimeout(timeout);

          logger.info(admin.username, "exec command", body.command);
          return { stdout, stderr, exitCode };
        },
        {
          body: t.Object({ command: t.String() }),
        },
      )

      .get(
        "/data/:table",
        async ({ params, query, db, headers, adminJwt, set }) => {
          if (!(await verifyAdmin(headers, adminJwt, db))) {
            set.status = 401;
            return { error: "Unauthorized" };
          }
          if (!getAdminTable(params.table)) {
            set.status = 404;
            return { error: "Table not found" };
          }

          const result = await listAdminRows(db, params.table, query);
          if (!result) {
            set.status = 404;
            return { error: "Table not found" };
          }

          result.data.forEach((row) =>
            replaceBuffers(row as Record<string, unknown>),
          );
          set.headers["X-Total-Count"] = String(result.total);
          return { data: result.data, total: result.total };
        },
      )

      .get(
        "/data/:table/:id",
        async ({ params, db, headers, adminJwt, set }) => {
          if (!(await verifyAdmin(headers, adminJwt, db))) {
            set.status = 401;
            return { error: "Unauthorized" };
          }
          const table = getAdminTable(params.table);
          if (!table) {
            set.status = 404;
            return { error: "Table not found" };
          }

          const idCol = adminTableColumn(table, "id");
          const [row] = await db
            .select()
            .from(table)
            .where(eq(idCol as never, params.id));
          if (!row) {
            set.status = 404;
            return { error: "Not found" };
          }
          replaceBuffers(row as Record<string, unknown>);
          return { data: row };
        },
      )

      .post(
        "/data/:table",
        async ({ params, body, db, headers, adminJwt, set }) => {
          const admin = await verifyAdmin(headers, adminJwt, db);
          if (!admin) {
            set.status = 401;
            return { error: "Unauthorized" };
          }
          const table = getAdminTable(params.table);
          if (!table) {
            set.status = 404;
            return { error: "Table not found" };
          }

          const cleaned = await cleanBody(
            body as Record<string, unknown>,
            params.table,
          );
          if (!cleaned.id) cleaned.id = newId();
          if (hasTimestamps.has(params.table)) {
            const ts = nowIso();
            if (!cleaned.created) cleaned.created = ts;
            cleaned.updated = ts;
          }

          if (params.table === "users" && !cleaned.passwordHash) {
            set.status = 400;
            return { error: "Password is required for new users" };
          }

          try {
            await db.insert(table).values(cleaned as never);
            const idCol = adminTableColumn(table, "id");
            const [row] = await db
              .select()
              .from(table)
              .where(eq(idCol as never, cleaned.id as string));
            replaceBuffers(row as Record<string, unknown>);
            maybeBroadcast(params.table, "create", cleaned.id as string);
            logger.info(admin.username, "admin created record", `${params.table}:${cleaned.id}`);
            return { data: row };
          } catch (err: unknown) {
            set.status = 400;
            return {
              error: err instanceof Error ? err.message : "Insert failed",
            };
          }
        },
      )

      .put(
        "/data/:table/:id",
        async ({ params, body, db, headers, adminJwt, set }) => {
          const admin = await verifyAdmin(headers, adminJwt, db);
          if (!admin) {
            set.status = 401;
            return { error: "Unauthorized" };
          }
          const table = getAdminTable(params.table);
          if (!table) {
            set.status = 404;
            return { error: "Table not found" };
          }

          const cleaned = await cleanBody(
            body as Record<string, unknown>,
            params.table,
          );
          delete cleaned.id;
          if (hasTimestamps.has(params.table)) cleaned.updated = nowIso();

          try {
            const idCol = adminTableColumn(table, "id");
            await db
              .update(table)
              .set(cleaned as never)
              .where(eq(idCol as never, params.id));
            const [row] = await db
              .select()
              .from(table)
              .where(eq(idCol as never, params.id));
            if (!row) {
              set.status = 404;
              return { error: "Not found" };
            }
            replaceBuffers(row as Record<string, unknown>);
            maybeBroadcast(params.table, "update", params.id);
            logger.info(admin.username, "admin updated record", `${params.table}:${params.id}`);
            return { data: row };
          } catch (err: unknown) {
            set.status = 400;
            return {
              error: err instanceof Error ? err.message : "Update failed",
            };
          }
        },
      )

      .delete(
        "/data/:table/:id",
        async ({ params, db, headers, adminJwt, set }) => {
          const admin = await verifyAdmin(headers, adminJwt, db);
          if (!admin) {
            set.status = 401;
            return { error: "Unauthorized" };
          }
          const table = getAdminTable(params.table);
          if (!table) {
            set.status = 404;
            return { error: "Table not found" };
          }

          const idCol = adminTableColumn(table, "id");
          const [row] = await db
            .select()
            .from(table)
            .where(eq(idCol as never, params.id));
          if (!row) {
            set.status = 404;
            return { error: "Not found" };
          }

          await db.delete(table).where(eq(idCol as never, params.id));
          replaceBuffers(row as Record<string, unknown>);
          maybeBroadcast(params.table, "delete", params.id);
          logger.info(admin.username, "admin deleted record", `${params.table}:${params.id}`);
          return { data: row };
        },
      ),
  )
  .get("/admin", async () => {
    const file = Bun.file("admin-panel/dist/index.html");
    if (await file.exists()) {
      return new Response(file, { headers: { "Content-Type": "text/html" } });
    }
    return new Response(
      "Admin panel not built. Run: cd admin-panel && bun run build",
      { status: 500 },
    );
  })
  .get("/admin/*", async ({ params }) => {
    const fp = sanitizePath(params["*"] || "index.html");
    const file = Bun.file(`admin-panel/dist/${fp}`);
    if (await file.exists()) {
      return new Response(file, {
        headers: { "Content-Type": mimeType(fp) },
      });
    }
    const idx = Bun.file("admin-panel/dist/index.html");
    if (await idx.exists()) {
      return new Response(idx, { headers: { "Content-Type": "text/html" } });
    }
    return new Response("Admin panel not built", { status: 500 });
  });
