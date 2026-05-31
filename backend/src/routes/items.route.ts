import { Elysia, t } from "elysia";
import { and, desc, eq, inArray, like, not, asc, sql } from "drizzle-orm";
import * as schema from "../db/schema";
import { newId } from "../lib/ids";
import { nowIso } from "../lib/dates";
import { parseFileInput } from "../lib/files";
import { compressSquare, isImageMime } from "../lib/images";
import { withRecordMeta } from "../lib/record";
import { broadcast } from "../lib/ws";
import { logger } from "../lib/logger";
import {
  addInventory,
  buyMarket,
  chargeInventory,
  discountMarket,
  removeMarketListing,
  sellInventory,
  tradeInventory,
} from "../services/economy.service";
import { authPlugin } from "../plugins/auth.plugin";
import { executeInventoryUse } from "../services/items/effect.items";

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

function mapItem(row: typeof schema.items.$inferSelect) {
  return withRecordMeta(row, "items");
}

import { dbPlugin } from "../plugins/db.plugin";

export const itemsRoute = new Elysia({ prefix: "/items" })
  .use(dbPlugin)
  .get(
    "/",
    async ({ db, query, set }) => {
      const limit = query.limit ? Math.min(Number(query.limit), 500) : 100;
      const offset = query.offset ? Number(query.offset) : 0;
      let q = db.select(itemListColumns).from(schema.items);
      const conditions: ReturnType<typeof eq>[] = [];

      if (query.labels) {
        const labels = query.labels.split(",").map((l) => l.trim()).filter(Boolean);
        if (labels.length > 0) {
          conditions.push(inArray(schema.items.label, labels));
        }
      }

      if (query.search) {
        const pattern = `%${query.search}%`;
        conditions.push(
          sql`(${schema.items.label} LIKE ${pattern} OR ${schema.items.description} LIKE ${pattern})`,
        );
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

      if (conditions.length > 0) {
        q = q.where(and(...conditions));
      }

      if (query.sort === "label") {
        q = q.orderBy(query.order === "desc" ? desc(schema.items.label) : asc(schema.items.label));
      } else if (query.sort === "created") {
        q = q.orderBy(query.order === "desc" ? desc(schema.items.created) : asc(schema.items.created));
      } else if (query.sort === "charge") {
        q = q.orderBy(query.order === "desc" ? desc(schema.items.charge) : asc(schema.items.charge));
      } else if (query.sort === "type") {
        q = q.orderBy(query.order === "desc" ? desc(schema.items.type) : asc(schema.items.type));
      }

      if (query.random) {
        const count = Math.min(Number(query.random), 100);
        const all = await q;
        const shuffled = [...all].sort(() => Math.random() - 0.5);
        set.headers["Cache-Control"] = "no-store";
        return shuffled.slice(0, count).map((r) => withRecordMeta(r, "items"));
      }

      const rows = await q.limit(limit).offset(offset);
      set.headers["Cache-Control"] = "no-store";
      return rows.map((r) => withRecordMeta(r, "items"));
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
  .get("/:id", async ({ params, db, set }) => {
    const [row] = await db
      .select()
      .from(schema.items)
      .where(eq(schema.items.id, params.id));
    if (!row) {
      set.status = 404;
      return { error: "Not found" };
    }
    return mapItem(row);
  })
  .post(
    "/",
    async ({ body, db }) => {
      const id = newId();
      const ts = nowIso();
      let imageFile = parseFileInput(body.image);
      if (imageFile && isImageMime(imageFile.mime)) {
        imageFile = {
          data: await compressSquare(imageFile.data),
          mime: "image/webp",
        };
      }
      await db.insert(schema.items).values({
        id,
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
      });
      broadcast("items", "create", id);
      logger.info(null, "created item", body.label, `(${body.type})`);
      return mapItem(
        (
          await db.select().from(schema.items).where(eq(schema.items.id, id))
        )[0]!,
      );
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
  .patch("/:id", async ({ params, body, db }) => {
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
    broadcast("items", "update", params.id);
    const [row] = await db
      .select()
      .from(schema.items)
      .where(eq(schema.items.id, params.id));
    logger.info(null, "updated item", row?.label ?? params.id);
    return mapItem(row!);
  }, {
    body: t.Object({
      type: t.Optional(t.String()),
      label: t.Optional(t.String()),
      description: t.Optional(t.String()),
      charge: t.Optional(t.Number()),
      rollable: t.Optional(t.Boolean()),
      status: t.Optional(t.Nullable(t.Array(t.String()))),
      image: t.Optional(t.Any()),
    }),
  })
  .delete("/:id", async ({ params, db }) => {
    await db.delete(schema.items).where(eq(schema.items.id, params.id));
    broadcast("items", "delete", params.id);
    logger.info(null, "deleted item", params.id);
    return { ok: true };
  });

export const inventoryRoute = new Elysia({ prefix: "/inventory" })
  .use(dbPlugin)
  .use(authPlugin)
  .get(
    "/",
    async ({ db, query }) => {
      const limit = query.limit ? Math.min(Number(query.limit), 500) : 100;
      const offset = query.offset ? Number(query.offset) : 0;
      let q = db.select().from(schema.inventory);
      const conditions: ReturnType<typeof eq>[] = [];

      if (query.owner) {
        conditions.push(eq(schema.inventory.owner, query.owner));
      }

      if (query.excludeOwner) {
        conditions.push(not(eq(schema.inventory.owner, query.excludeOwner)));
      }

      if (query.type) {
        conditions.push(eq(schema.inventory.type, query.type));
      }

      if (query.search) {
        const pattern = `%${query.search}%`;
        conditions.push(
          sql`(${schema.inventory.label} LIKE ${pattern} OR ${schema.inventory.description} LIKE ${pattern})`,
        );
      }

      if (conditions.length > 0) {
        q = q.where(and(...conditions));
      }

      const rows = await q.limit(limit).offset(offset);
      return rows.map((r) => withRecordMeta(r, "inventory"));
    },
    {
      query: t.Optional(
        t.Object({
          owner: t.Optional(t.String()),
          excludeOwner: t.Optional(t.String()),
          type: t.Optional(t.String()),
          search: t.Optional(t.String()),
          limit: t.Optional(t.String()),
          offset: t.Optional(t.String()),
        }),
      ),
    },
  )
  .get("/:id", async ({ params, db, set }) => {
    const [row] = await db
      .select()
      .from(schema.inventory)
      .where(eq(schema.inventory.id, params.id));
    if (!row) {
      set.status = 404;
      return { error: "Not found" };
    }
    return withRecordMeta(row, "inventory");
  })
  .post(
    "/add",
    async ({ body, db, user }) => {
      const result = await addInventory(db, body.userId, body.itemId);
      logger.info(user?.username, "added item to inventory", `user:${body.userId}`, `item:${body.itemId}`);
      return result;
    },
    {
      body: t.Object({
        userId: t.String(),
        itemId: t.String(),
      }),
    },
  )
  .post(
    "/:id/transfer",
    async ({ params, body, db, user }) => {
      await db
        .update(schema.inventory)
        .set({ owner: body.newOwner, updated: nowIso() })
        .where(eq(schema.inventory.id, params.id));
      broadcast("inventory", "update", params.id);
      logger.info(user?.username, "transferred inventory item", params.id, `to:${body.newOwner}`);
      return { ok: true };
    },
    {
      body: t.Object({
        newOwner: t.String(),
      }),
    },
  )
  .post(
    "/:id/use",
    async ({ params, user, db, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      const result = await executeInventoryUse(db, user.sub, params.id);
      logger.info(user.username, "used inventory item", params.id);
      return result;
    },
    {
      detail: {
        tags: ["items"],
        summary: "Use inventory item (server effects)",
      },
    },
  )
  .post(
    "/:id/charge",
    async ({ params, body, db, user }) => {
      const result = await chargeInventory(db, params.id, body.oldCharge, body.newCharge);
      logger.info(user?.username, "charged inventory item", params.id, `${body.oldCharge}→${body.newCharge}`);
      return result;
    },
    {
      body: t.Object({
        oldCharge: t.Number(),
        newCharge: t.Number(),
      }),
    },
  )
  .delete("/:id", async ({ params, db, user }) => {
    await db.delete(schema.inventory).where(eq(schema.inventory.id, params.id));
    broadcast("inventory", "delete", params.id);
    logger.info(user?.username, "deleted inventory item", params.id);
    return { ok: true };
  });

export const marketRoute = new Elysia({ prefix: "/market" })
  .use(dbPlugin)
  .get(
    "/",
    async ({ db, query }) => {
      const limit = query.limit ? Math.min(Number(query.limit), 500) : 100;
      const offset = query.offset ? Number(query.offset) : 0;
      let q = db
        .select()
        .from(schema.market)
        .orderBy(desc(schema.market.created));

      if (query.search) {
        const pattern = `%${query.search}%`;
        q = q.where(
          sql`(${schema.market.label} LIKE ${pattern} OR ${schema.market.owner} LIKE ${pattern})`,
        );
      }

      const rows = await q.limit(limit).offset(offset);
      return rows.map((r) => withRecordMeta(r, "market"));
    },
    {
      query: t.Optional(
        t.Object({
          search: t.Optional(t.String()),
          limit: t.Optional(t.String()),
          offset: t.Optional(t.String()),
        }),
      ),
    },
  )
  .get("/:id", async ({ params, db, set }) => {
    const [row] = await db
      .select()
      .from(schema.market)
      .where(eq(schema.market.id, params.id));
    if (!row) {
      set.status = 404;
      return { error: "Not found" };
    }
    return withRecordMeta(row, "market");
  })
  .post(
    "/sell",
    async ({ body, db }) => {
      const result = await sellInventory(db, body.inventoryId, body.ownerId, body.price);
      logger.info(null, "listed item on market", `item:${body.inventoryId}`, `price:${body.price}`);
      return result;
    },
    {
      body: t.Object({
        inventoryId: t.String(),
        ownerId: t.String(),
        price: t.Number(),
      }),
    },
  )
  .post(
    "/:id/buy",
    async ({ params, body, db }) => {
      const result = await buyMarket(db, params.id, body.newOwnerId, body.oldOwnerId);
      logger.info(null, "bought market item", params.id, `buyer:${body.newOwnerId}`);
      return result;
    },
    {
      body: t.Object({
        newOwnerId: t.String(),
        oldOwnerId: t.String(),
      }),
    },
  )
  .post("/:id/remove", async ({ params, db }) => {
    const result = await removeMarketListing(db, params.id);
    logger.info(null, "removed market listing", params.id);
    return result;
  })
  .post(
    "/:id/discount",
    async ({ params, body, db }) => {
      const result = await discountMarket(db, params.id, body.ownerId, body.price, body.discountPrice);
      logger.info(null, "discounted market item", params.id, `${body.price}→${body.discountPrice}`);
      return result;
    },
    {
      body: t.Object({
        ownerId: t.String(),
        price: t.Number(),
        discountPrice: t.Number(),
      }),
    },
  )
  .delete("/:id", async ({ params, db }) => {
    await db.delete(schema.market).where(eq(schema.market.id, params.id));
    broadcast("market", "delete", params.id);
    logger.info(null, "deleted market listing", params.id);
    return { ok: true };
  });

export const tradeRoute = new Elysia({ prefix: "/trade" })
  .use(dbPlugin)
  .post(
    "/",
    async ({ body, db }) => {
      const result = await tradeInventory(db, body.currentUser, body.otherUser);
      logger.info(null, "trade completed", `${body.currentUser.id} ↔ ${body.otherUser.id}`);
      return result;
    },
    {
      body: t.Object({
        currentUser: t.Object({
          id: t.String(),
          money: t.Number(),
          items: t.Array(t.String()),
        }),
        otherUser: t.Object({
          id: t.String(),
          money: t.Number(),
          items: t.Array(t.String()),
        }),
      }),
    },
  );
