import { Elysia, t } from "elysia";
import { and, asc, desc, eq, inArray, like, not, sql, type SQL } from "drizzle-orm";
import * as schema from "@/db/schema.db";
import { newId, nowIso, withRecordMeta } from "@/lib/index.utils";
import { parseFileInput } from "@/lib/files.utils";
import { compressSquare, isImageMime } from "@/lib/images.utils";
import { broadcast } from "@/lib/websocket.utils";
import { cacheGet, cacheSet, cacheDel } from "@/lib/cache.utils";
import Logger from "@/lib/logger.utils";
import databasePlugin from "@/plugins/database.plugin";
import type { Db, DbTimestamps } from "@/types/server";

const logger = new Logger("ITEMS");

const itemListColumns = {
  id: schema.items.id,
  type: schema.items.type,
  label: schema.items.label,
  description: schema.items.description,
  charge: schema.items.charge,
  rollable: schema.items.rollable,
  status: schema.items.status,
  hasImage: sql<boolean>`${schema.items.image} IS NOT NULL`,
  created: schema.items.created,
  updated: schema.items.updated,
};

type ItemListRow = {
  id: string;
  type: string;
  label: string;
  description: string;
  charge: number;
  rollable: boolean;
  status: string | null;
  hasImage: boolean;
  created: string;
  updated: string;
};

function mapItem(row: typeof schema.items.$inferSelect) {
  return withRecordMeta(row, "items");
}

function buildItemConditions(query: Record<string, string | undefined>): SQL[] {
  const conditions: SQL[] = [];

  if (query.labels) {
    const labels = query.labels
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean);
    if (labels.length > 0) {
      conditions.push(inArray(schema.items.label, labels));
    }
  }

  if (query.type) {
    conditions.push(eq(schema.items.type, query.type));
  }

  if (query.rollable !== undefined) {
    conditions.push(eq(schema.items.rollable, query.rollable === "true"));
  }

  if (query.excludeLabel) {
    conditions.push(not(eq(schema.items.label, query.excludeLabel)));
  }

  if (query.search) {
    conditions.push(like(schema.items.label, `%${query.search}%`));
  }

  return conditions;
}

function queryItems(db: Db, query: Record<string, string | undefined>) {
  const conditions = buildItemConditions(query);

  let q =
    conditions.length > 0
      ? db
          .select(itemListColumns)
          .from(schema.items)
          .where(and(...conditions))
      : db.select(itemListColumns).from(schema.items);

  if (query.sort === "label") {
    q = q.orderBy(
      query.order === "desc"
        ? desc(schema.items.label)
        : asc(schema.items.label),
    ) as typeof q;
  } else if (query.sort === "created") {
    q = q.orderBy(
      query.order === "desc"
        ? desc(schema.items.created)
        : asc(schema.items.created),
    ) as typeof q;
  } else if (query.sort === "charge") {
    q = q.orderBy(
      query.order === "desc"
        ? desc(schema.items.charge)
        : asc(schema.items.charge),
    ) as typeof q;
  } else if (query.sort === "type") {
    q = q.orderBy(
      query.order === "desc" ? desc(schema.items.type) : asc(schema.items.type),
    ) as typeof q;
  }

  return q;
}

export default new Elysia({ prefix: "/items" })
  .use(databasePlugin)
  .get(
    "/",
    async ({ db, query, set }) => {
      const limit = query.limit
        ? Math.min(Number(query.limit), 500)
        : undefined;
      const offset = query.offset ? Number(query.offset) : 0;

      if (query.random) {
        const conditions = buildItemConditions(query);
        let q =
          conditions.length > 0
            ? db
                .select(itemListColumns)
                .from(schema.items)
                .where(and(...conditions))
            : db.select(itemListColumns).from(schema.items);
        const all = await q;
        const count = Math.min(Number(query.random), 100);
        const shuffled = [...all].sort(() => Math.random() - 0.5);
        set.headers["Cache-Control"] = "no-store";
        return shuffled.slice(0, count).map((r) => withRecordMeta(r, "items"));
      }

      if (
        query.sort ||
        query.labels ||
        query.type ||
        query.search ||
        query.rollable !== undefined ||
        query.excludeLabel
      ) {
        const all = await queryItems(db, query);
        const rows = all.slice(offset, offset + (limit ?? all.length));
        set.headers["Cache-Control"] = "no-store";
        return rows.map((r) => withRecordMeta(r, "items"));
      }

      let rows = await cacheGet<ItemListRow[]>("items:list");

      if (!rows) {
        rows = await db.select(itemListColumns).from(schema.items) as unknown as ItemListRow[];
        await cacheSet("items:list", rows, 30_000);
      }

      set.headers["Cache-Control"] = "no-store";
      return rows!
        .slice(offset, offset + (limit ?? rows!.length))
        .map((r) => withRecordMeta(r as DbTimestamps, "items"));
    },
    {
      query: t.Optional(
        t.Object({
          labels: t.Optional(t.String()),
          search: t.Optional(t.String()),
          type: t.Optional(t.String()),
          rollable: t.Optional(t.String()),
          excludeLabel: t.Optional(t.String()),
          sort: t.Optional(t.String()),
          order: t.Optional(t.String()),
          random: t.Optional(t.String()),
          limit: t.Optional(t.String()),
          offset: t.Optional(t.String()),
        }),
      ),
    },
  )
  .get(
    "/:id",
    async ({ params, db, set }) => {
      const [row] = await db
        .select()
        .from(schema.items)
        .where(eq(schema.items.id, params.id));
      if (!row) {
        set.status = 404;
        return { error: "Not found" };
      }
      return mapItem(row);
    },
    { params: t.Object({ id: t.String() }) },
  )
  .post(
    "/",
    async ({ body, db }) => {
      const ts = nowIso();
      let imageFile = parseFileInput(body.image);
      if (imageFile && isImageMime(imageFile.mime)) {
        imageFile = {
          data: await compressSquare(imageFile.data),
          mime: "image/webp",
        };
      }
      const row = {
        type: body.type,
        label: body.label,
        description: body.description ?? "",
        charge: body.charge ?? 0,
        rollable: body.rollable ?? false,
        status: body.status ?? null,
        image: imageFile?.data ?? null,
        imageMime: imageFile?.mime ?? null,
        created: ts,
        updated: ts,
      };
      const id = newId();
      await db.insert(schema.items).values({ ...row, id });
      cacheDel("items:list");
      broadcast("items", "create", id);
      logger.info(`created item ${body.label} (${body.type})`);
      return mapItem({ id, ...row } as typeof schema.items.$inferSelect);
    },
    {
      body: t.Object({
        type: t.String(),
        label: t.String(),
        description: t.Optional(t.String()),
        charge: t.Optional(t.Number()),
        rollable: t.Optional(t.Boolean()),
        status: t.Optional(t.Nullable(t.Array(t.String()))),
        image: t.Optional(t.Any()),
      }),
    },
  )
  .patch(
    "/:id",
    async ({ params, body, db }) => {
      let imageFile = parseFileInput(body.image);
      if (imageFile && isImageMime(imageFile.mime)) {
        imageFile = {
          data: await compressSquare(imageFile.data),
          mime: "image/webp",
        };
      }
      const patch: Partial<typeof schema.items.$inferInsert> = {
        updated: nowIso(),
      };
      if (body.type !== undefined) patch.type = body.type;
      if (body.label !== undefined) patch.label = body.label;
      if (body.description !== undefined) patch.description = body.description;
      if (body.charge !== undefined) patch.charge = body.charge;
      if (body.rollable !== undefined) patch.rollable = body.rollable;
      if (body.status !== undefined) patch.status = body.status;
      if (imageFile !== undefined) {
        patch.image = imageFile?.data ?? null;
        patch.imageMime = imageFile?.mime ?? null;
      }
      await db
        .update(schema.items)
        .set(patch)
        .where(eq(schema.items.id, params.id));
      cacheDel("items:list");
      broadcast("items", "update", params.id);
      const [row] = await db
        .select()
        .from(schema.items)
        .where(eq(schema.items.id, params.id));
      logger.info(`updated item ${row?.label ?? params.id}`);
      return mapItem(row!);
    },
    {
      body: t.Object({
        type: t.Optional(t.String()),
        label: t.Optional(t.String()),
        description: t.Optional(t.String()),
        charge: t.Optional(t.Number()),
        rollable: t.Optional(t.Boolean()),
        status: t.Optional(t.Nullable(t.Array(t.String()))),
        image: t.Optional(t.Any()),
      }),
    },
  )
  .delete(
    "/:id",
    async ({ params, db }) => {
      await db.delete(schema.items).where(eq(schema.items.id, params.id));
      cacheDel("items:list");
      broadcast("items", "delete", params.id);
      logger.info(`deleted item ${params.id}`);
      return { ok: true };
    },
    { params: t.Object({ id: t.String() }) },
  );
