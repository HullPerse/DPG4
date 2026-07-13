import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { eq, inArray } from "drizzle-orm";
import * as schema from "@/db/schema.db";
import { config } from "../server.config";
import databasePlugin from "@/plugins/database.plugin";
import servicesPlugin from "../services.server";
import { newId, nowIso } from "@/lib/index.utils";
import { getAdminSchemaPayload } from "../lib/admin/schema.admin";
import {
  getAdminStats,
  invalidateAdminStatsCache,
  listAdminRows,
} from "../lib/admin/query.admin";
import { adminTableColumn, getAdminTable } from "../lib/admin/tables.admin";
import {
  maybeBroadcast,
  hasTimestamps,
  cleanBody,
  sanitizePath,
  mimeType,
  replaceBuffers,
  verifyAdmin,
} from "../lib/admin/admin.utils";
import { broadcastAdminReload, broadcastAdminLogout } from "../lib/websocket.utils";
import Logger, { LOG_FILE } from "../lib/logger.utils";

const logger = new Logger("ADMIN");

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
        logger.info("Admin broadcast reloaded");
        return { ok: true };
      })
      .post("/broadcast-logout", async ({ headers, adminJwt, db, set }) => {
        const admin = await verifyAdmin(headers, adminJwt, db);
        if (!admin) {
          set.status = 401;
          return { error: "Unauthorized" };
        }
        broadcastAdminLogout();
        logger.info("Admin broadcast logout");
        return { ok: true };
      })
      .post(
        "/grant-item",
        async ({ body, db, headers, adminJwt, set, economyService }) => {
          const admin = await verifyAdmin(headers, adminJwt, db);
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
          const [grantedItem] = await db
            .select({ label: schema.items.label })
            .from(schema.items)
            .where(eq(schema.items.id, body.itemId));
          logger
            .setAuthor(admin.username)
            .info(`Admin granted item: user: ${body.userId} item: ${grantedItem?.label ?? body.itemId}`);
          return { ok: true };
        },
        { body: t.Object({ userId: t.String(), itemId: t.String() }) },
      )
      .get(
        "/search",
        async ({ headers, adminJwt, db, set, query }) => {
          const admin = await verifyAdmin(headers, adminJwt, db);
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
        const admin = await verifyAdmin(headers, adminJwt, db);
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
          const admin = await verifyAdmin(headers, adminJwt, db);
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
