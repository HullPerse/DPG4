import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { eq, inArray } from "drizzle-orm";
import * as schema from "@/db/schema.db";
import { config } from "../server.config";
import databasePlugin from "@/plugins/database.plugin";
import servicesPlugin from "../services.server";
import { newId, nowIso } from "@/lib/index.utils";
import {
  ADMIN_BLOB_FIELDS,
  ADMIN_JSON_FIELDS,
  getAdminSchemaPayload,
} from "../lib/admin/schema.admin";
import {
  getAdminStats,
  invalidateAdminStatsCache,
  listAdminRows,
} from "../lib/admin/query.admin";
import { adminTableColumn, getAdminTable } from "../lib/admin/tables.admin";
import { broadcast, broadcastAdminReload } from "../lib/websocket.utils";
import Logger, { LOG_FILE } from "../lib/logger.utils";

const logger = new Logger("ADMIN");

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
  "hangman",
  "pets",
  "inventoryLog",
  "quests",
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
  "hangman",
  "pets",
  "inventoryLog",
  "quests",
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

const adminRoute = new Elysia()
  .use(databasePlugin)
  .use(servicesPlugin)
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
          logger.setAuthor(user.username).info("Logged in as admin");
          return { token, user: { id: user.id, username: user.username } };
        },
        { body: t.Object({ username: t.String(), password: t.String() }) },
      )
      .get("/verify", async ({ headers, adminJwt, db }) => {
        const admin = await verifyAdmin(
          headers,
          adminJwt as {
            verify: (t: string) => Promise<false | AdminJwtPayload>;
          },
          db,
        );
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
        if (
          !(await verifyAdmin(
            headers,
            adminJwt as {
              verify: (t: string) => Promise<false | AdminJwtPayload>;
            },
            db,
          ))
        ) {
          set.status = 401;
          return { error: "Unauthorized" };
        }
        return { counts: await getAdminStats(db) };
      })
      .post("/broadcast-reload", async ({ headers, adminJwt, db, set }) => {
        const admin = await verifyAdmin(
          headers,
          adminJwt as {
            verify: (t: string) => Promise<false | AdminJwtPayload>;
          },
          db,
        );
        if (!admin) {
          set.status = 401;
          return { error: "Unauthorized" };
        }
        broadcastAdminReload();
        logger.info("Admin broadcast reloaded");
        return { ok: true };
      })
      .post(
        "/grant-item",
        async ({ body, db, headers, adminJwt, set, economyService }) => {
          const admin = await verifyAdmin(
            headers,
            adminJwt as {
              verify: (t: string) => Promise<false | AdminJwtPayload>;
            },
            db,
          );
          if (!admin) {
            set.status = 401;
            return { error: "Unauthorized" };
          }
          const ok = await economyService.addInventory(
            body.userId,
            body.itemId,
            "grant",
          );
          if (!ok) {
            set.status = 400;
            return { error: "User or item not found" };
          }
          logger
            .setAuthor(admin.username)
            .info(`Admin granted item: user: ${body.userId}/${body.itemId}`);
          return { ok: true };
        },
        { body: t.Object({ userId: t.String(), itemId: t.String() }) },
      )
      .get(
        "/search",
        async ({ headers, adminJwt, db, set, query }) => {
          const admin = await verifyAdmin(
            headers,
            adminJwt as {
              verify: (t: string) => Promise<false | AdminJwtPayload>;
            },
            db,
          );
          if (!admin) {
            set.status = 401;
            return { error: "Unauthorized" };
          }
          const q = (query.q ?? "").trim();
          if (!q || q.length < 2) return { results: [] };
          const results: Record<string, unknown[]> = {};
          const schema = getAdminSchemaPayload().tables;
          for (const [name] of Object.entries(schema)) {
            const table = getAdminTable(name);
            if (!table) continue;
            const result = await listAdminRows(db, name, {
              q,
              _perPage: "10",
              _page: "1",
              _sort: "created",
              _order: "DESC",
            });
            if (result && result.data.length > 0) results[name] = result.data;
          }
          return { results };
        },
        { query: t.Object({ q: t.String() }) },
      )
      .get("/logs", async ({ headers, adminJwt, db, set, query }) => {
        const admin = await verifyAdmin(
          headers,
          adminJwt as {
            verify: (t: string) => Promise<false | AdminJwtPayload>;
          },
          db,
        );
        if (!admin) {
          set.status = 401;
          return { error: "Unauthorized" };
        }
        if (!(await Bun.file(LOG_FILE).exists()))
          return { lines: [], total: 0 };
        const raw = await Bun.file(LOG_FILE).text();
        const allLines = raw.trim().split("\n").filter(Boolean).reverse();
        const linesMax = Math.min(
          Math.max(Number(query.lines) || 100, 1),
          5000,
        );
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
          const admin = await verifyAdmin(
            headers,
            adminJwt as {
              verify: (t: string) => Promise<false | AdminJwtPayload>;
            },
            db,
          );
          if (!admin) {
            set.status = 401;
            return { error: "Unauthorized" };
          }
          const proc = Bun.spawn(["cmd", "/c", body.command], {
            stdio: ["ignore", "pipe", "pipe"],
          });
          const timeout = setTimeout(() => proc.kill(), 30_000);
          const stdout = await new Response(proc.stdout).text();
          const stderr = await new Response(proc.stderr).text();
          const exitCode = await proc.exited;
          clearTimeout(timeout);
          logger.setAuthor(admin.username).info(`exec command ${body.command}`);
          return { stdout, stderr, exitCode };
        },
        { body: t.Object({ command: t.String() }) },
      )
      .get(
        "/data/:table",
        async ({ params, query, db, headers, adminJwt, set }) => {
          if (
            !(await verifyAdmin(
              headers,
              adminJwt as {
                verify: (t: string) => Promise<false | AdminJwtPayload>;
              },
              db,
            ))
          ) {
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
          if (
            !(await verifyAdmin(
              headers,
              adminJwt as {
                verify: (t: string) => Promise<false | AdminJwtPayload>;
              },
              db,
            ))
          ) {
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
          const admin = await verifyAdmin(
            headers,
            adminJwt as {
              verify: (t: string) => Promise<false | AdminJwtPayload>;
            },
            db,
          );
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
            invalidateAdminStatsCache();
            maybeBroadcast(params.table, "create", cleaned.id as string);
            logger
              .setAuthor(admin.username)
              .info(`admin created record ${params.table}:${cleaned.id}`);

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
          const admin = await verifyAdmin(
            headers,
            adminJwt as {
              verify: (t: string) => Promise<false | AdminJwtPayload>;
            },
            db,
          );
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
            invalidateAdminStatsCache();
            maybeBroadcast(params.table, "update", params.id);
            logger
              .setAuthor(admin.username)
              .info(`admin updated record ${params.table}:${params.id}`);

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
          const admin = await verifyAdmin(
            headers,
            adminJwt as {
              verify: (t: string) => Promise<false | AdminJwtPayload>;
            },
            db,
          );
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
          invalidateAdminStatsCache();
          replaceBuffers(row as Record<string, unknown>);
          maybeBroadcast(params.table, "delete", params.id);
          logger
            .setAuthor(admin.username)
            .info(`admin deleted record ${params.table}:${params.id}`);

          return { data: row };
        },
      )
      .post(
        "/data/:table/batch-delete",
        async ({ params, body, db, headers, adminJwt, set }) => {
          const admin = await verifyAdmin(
            headers,
            adminJwt as {
              verify: (t: string) => Promise<false | AdminJwtPayload>;
            },
            db,
          );
          if (!admin) {
            set.status = 401;
            return { error: "Unauthorized" };
          }
          const table = getAdminTable(params.table);
          if (!table) {
            set.status = 404;
            return { error: "Table not found" };
          }
          const { ids } = body as { ids: string[] };
          if (!Array.isArray(ids) || ids.length === 0) {
            set.status = 400;
            return { error: "ids array is required" };
          }
          const idCol = adminTableColumn(table, "id");
          await db.delete(table).where(inArray(idCol as never, ids));
          invalidateAdminStatsCache();
          for (const id of ids) {
            maybeBroadcast(params.table, "delete", id);
          }

          logger
            .setAuthor(admin.username)
            .info(`admin batch deleted ${params.table}:${ids.length} records`);

          return { ok: true, deleted: ids.length };
        },
      )
      .get(
        "/data/:table/export",
        async ({ params, query, db, headers, adminJwt, set }) => {
          if (
            !(await verifyAdmin(
              headers,
              adminJwt as {
                verify: (t: string) => Promise<false | AdminJwtPayload>;
              },
              db,
            ))
          ) {
            set.status = 401;
            return { error: "Unauthorized" };
          }
          const table = getAdminTable(params.table);
          if (!table) {
            set.status = 404;
            return { error: "Table not found" };
          }
          const rows = await db.select().from(table);
          rows.forEach((row) => replaceBuffers(row as Record<string, unknown>));
          return rows;
        },
      ),
  )
  .get("/admin", async () => {
    const file = Bun.file("admin/dist/index.html");
    if (await file.exists()) {
      return new Response(file, { headers: { "Content-Type": "text/html" } });
    }
    return new Response(
      "Admin panel not built. Run: cd admin && bun run build",
      { status: 500 },
    );
  })
  .get("/admin/*", async ({ params }) => {
    const fp = sanitizePath(params["*"] || "index.html");
    const file = Bun.file(`admin/dist/${fp}`);
    if (await file.exists()) {
      return new Response(file, { headers: { "Content-Type": mimeType(fp) } });
    }
    const idx = Bun.file("admin/dist/index.html");
    if (await idx.exists()) {
      return new Response(idx, { headers: { "Content-Type": "text/html" } });
    }
    return new Response("Admin panel not built", { status: 500 });
  });

export default adminRoute;
