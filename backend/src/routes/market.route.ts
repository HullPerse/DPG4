import { Elysia, t } from "elysia";
import { and, desc, eq, like, or, type SQL } from "drizzle-orm";
import * as schema from "@/db/schema.db";
import { withRecordMeta } from "@/lib/index.utils";
import { broadcast } from "@/lib/websocket.utils";
import Logger from "@/lib/logger.utils";
import servicesPlugin from "@/services.server";
import { authPlugin, databasePlugin } from "@/plugins/index.plugin";

const logger = new Logger("MARKET");

export default new Elysia({ prefix: "/market" })
  .use(databasePlugin)
  .use(servicesPlugin)
  .use(authPlugin)
  .get(
    "/",
    async ({ db, query }) => {
      const limit = query.limit ? Math.min(Number(query.limit), 500) : 100;
      const offset = query.offset ? Number(query.offset) : 0;
      const conditions: SQL[] = [];

      if (query.search) {
        conditions.push(
          or(
            like(schema.market.label, `%${query.search}%`),
            like(schema.market.description, `%${query.search}%`),
          )!,
        );
      }

      const q =
        conditions.length > 0
          ? db
              .select()
              .from(schema.market)
              .where(and(...conditions))
          : db.select().from(schema.market);

      const rows = await q
        .orderBy(desc(schema.market.created))
        .limit(limit)
        .offset(offset);

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
  .get(
    "/:id",
    async ({ params, db, set }) => {
      const [row] = await db
        .select()
        .from(schema.market)
        .where(eq(schema.market.id, params.id));
      if (!row) {
        set.status = 404;
        return { error: "Not found" };
      }
      return withRecordMeta(row, "market");
    },
    { params: t.Object({ id: t.String() }) },
  )
  .post(
    "/sell",
    async ({ body, economyService, user, db, set }) => {
      const [inv] = await db
        .select()
        .from(schema.inventory)
        .where(eq(schema.inventory.id, body.inventoryId));
      if (!inv || inv.owner !== user.sub) {
        set.status = 403;
        return { error: "Not your inventory item" };
      }
      const result = await economyService.sellInventory(
        body.inventoryId,
        body.ownerId,
        body.price,
      );
      logger.info(
        `listed item on market item:${body.inventoryId} price:${body.price}`,
      );
      return result;
    },
    {
      requireAuth: true,
      body: t.Object({
        inventoryId: t.String(),
        ownerId: t.String(),
        price: t.Number(),
      }),
    },
  )
  .post(
    "/:id/buy",
    async ({ params, body, economyService, user, set }) => {
      if (user.sub !== body.newOwnerId) {
        set.status = 403;
        return { error: "Cannot buy on behalf of another user" };
      }
      const result = await economyService.buyMarket(
        params.id,
        body.newOwnerId,
        body.oldOwnerId,
      );
      logger.info(`bought market item ${params.id} buyer:${body.newOwnerId}`);
      return result;
    },
    {
      requireAuth: true,
      body: t.Object({
        newOwnerId: t.String(),
        oldOwnerId: t.String(),
      }),
    },
  )
  .post(
    "/:id/remove",
    async ({ params, economyService, user, db, set }) => {
      const [listing] = await db
        .select()
        .from(schema.market)
        .where(eq(schema.market.id, params.id));
      if (!listing) {
        set.status = 404;
        return { error: "Listing not found" };
      }
      if ((listing.owner as unknown as string) !== user.sub) {
        set.status = 403;
        return { error: "Not your listing" };
      }
      const result = await economyService.removeMarketListing(params.id);
      logger.info(`removed market listing ${params.id}`);
      return result;
    },
    { requireAuth: true },
  )
  .post(
    "/:id/discount",
    async ({ params, body, economyService, user, set }) => {
      if (user.sub !== body.ownerId) {
        set.status = 403;
        return { error: "Not your listing" };
      }
      const result = await economyService.discountMarket(
        params.id,
        body.ownerId,
        body.price,
        body.discountPrice,
      );
      logger.info(
        `discounted market item ${params.id} ${body.price}->${body.discountPrice}`,
      );
      return result;
    },
    {
      requireAuth: true,
      body: t.Object({
        ownerId: t.String(),
        price: t.Number(),
        discountPrice: t.Number(),
      }),
    },
  )
  .delete(
    "/:id",
    async ({ params, db, user, set }) => {
      const [listing] = await db
        .select()
        .from(schema.market)
        .where(eq(schema.market.id, params.id));
      if (!listing) {
        set.status = 404;
        return { error: "Listing not found" };
      }
      if ((listing.owner as unknown as string) !== user.sub) {
        set.status = 403;
        return { error: "Not your listing" };
      }
      await db.delete(schema.market).where(eq(schema.market.id, params.id));
      broadcast("market", "delete", params.id);
      logger.info(`deleted market listing ${params.id}`);
      return { ok: true };
    },
    { requireAuth: true, params: t.Object({ id: t.String() }) },
  );
