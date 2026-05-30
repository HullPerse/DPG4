import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema";
import { config } from "../config";
import { dbPlugin } from "../plugins/db.plugin";
import { newId } from "../lib/ids";
import { nowIso } from "../lib/dates";
import {
  ADMIN_BLOB_FIELDS,
  ADMIN_JSON_FIELDS,
  getAdminSchemaPayload,
} from "../lib/admin-schema";
import {
  getAdminTable,
  getAdminStats,
  listAdminRows,
} from "../lib/admin-query";
import { broadcastAdminReload } from "../lib/ws";
import { addInventory } from "../services/economy.service";

type AnyTable = typeof schema.users;

const tables: Record<string, AnyTable> = {
  users: schema.users,
  games: schema.games,
  presets: schema.presets,
  items: schema.items,
  inventory: schema.inventory,
  market: schema.market,
  activity: schema.activity,
  chats: schema.chats,
  rules: schema.rules,
  ads: schema.ads,
  drawings: schema.drawings,
  cells: schema.cells,
};

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

function cleanBody(
  body: Record<string, unknown>,
  tbl: string,
): Record<string, unknown> {
  const jf = ADMIN_JSON_FIELDS[tbl] ?? [];
  const bf = ADMIN_BLOB_FIELDS[tbl] ?? [];
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if ((k === "id" || k === "passwordHash") && !v) continue;
    if (k === "collectionId" || k === "collectionName") continue;
    out[k] = jf.includes(k) ? tryParseJson(v) : v;
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
    }
  }
  return out;
}

function sanitizePath(p: string): string {
  return p
    .replace(/\.\.\//g, "")
    .replace(/\.\.\\/g, "")
    .replace(/\0/g, "");
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        if (!(await verifyAdmin(headers, adminJwt, db))) {
          set.status = 401;
          return { error: "Unauthorized" };
        }
        broadcastAdminReload();
        return { ok: true };
      })

      .post(
        "/grant-item",
        async ({ body, db, headers, adminJwt, set }) => {
          if (!(await verifyAdmin(headers, adminJwt, db))) {
            set.status = 401;
            return { error: "Unauthorized" };
          }
          const ok = await addInventory(db, body.userId, body.itemId);
          if (!ok) {
            set.status = 400;
            return { error: "User or item not found" };
          }
          return { ok: true };
        },
        {
          body: t.Object({
            userId: t.String(),
            itemId: t.String(),
          }),
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

          result.data.forEach((row) => replaceBuffers(row as Record<string, unknown>));
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
          const table = tables[params.table];
          if (!table) {
            set.status = 404;
            return { error: "Table not found" };
          }

          const [row] = await db
            .select()
            .from(table)
            .where(eq((table as typeof schema.users).id, params.id));
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
          if (!(await verifyAdmin(headers, adminJwt, db))) {
            set.status = 401;
            return { error: "Unauthorized" };
          }
          const table = tables[params.table];
          if (!table) {
            set.status = 404;
            return { error: "Table not found" };
          }

          const cleaned = cleanBody(
            body as Record<string, unknown>,
            params.table,
          );
          if (!cleaned.id) cleaned.id = newId();
          if (hasTimestamps.has(params.table)) {
            const ts = nowIso();
            if (!cleaned.created) cleaned.created = ts;
            cleaned.updated = ts;
          }

          try {
            await db.insert(table).values(cleaned);
            const [row] = await db
              .select()
              .from(table)
              .where(eq((table as typeof schema.users).id, cleaned.id as string));
            replaceBuffers(row as Record<string, unknown>);
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
          if (!(await verifyAdmin(headers, adminJwt, db))) {
            set.status = 401;
            return { error: "Unauthorized" };
          }
          const table = tables[params.table];
          if (!table) {
            set.status = 404;
            return { error: "Table not found" };
          }

          const cleaned = cleanBody(
            body as Record<string, unknown>,
            params.table,
          );
          delete cleaned.id;
          if (hasTimestamps.has(params.table)) cleaned.updated = nowIso();

          try {
            await db
              .update(table)
              .set(cleaned)
              .where(eq((table as typeof schema.users).id, params.id));
            const [row] = await db
              .select()
              .from(table)
              .where(eq((table as typeof schema.users).id, params.id));
            if (!row) {
              set.status = 404;
              return { error: "Not found" };
            }
            replaceBuffers(row as Record<string, unknown>);
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
          if (!(await verifyAdmin(headers, adminJwt, db))) {
            set.status = 401;
            return { error: "Unauthorized" };
          }
          const table = tables[params.table];
          if (!table) {
            set.status = 404;
            return { error: "Table not found" };
          }

          const [row] = await db
            .select()
            .from(table)
            .where(eq((table as typeof schema.users).id, params.id));
          if (!row) {
            set.status = 404;
            return { error: "Not found" };
          }

          await db.delete(table).where(eq((table as typeof schema.users).id, params.id));
          replaceBuffers(row as Record<string, unknown>);
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
