import { Elysia, t } from "elysia";
import { desc, eq } from "drizzle-orm";
import * as schema from "../db/schema";
import { withRecordMeta } from "../lib/record";
import { broadcast } from "../lib/ws";
import { logger } from "../lib/logger";
import { dbPlugin } from "../plugins/db.plugin";
import { servicesPlugin } from "../services.server";

export const marketRoute = new Elysia({ prefix: "/market" })
  .use(dbPlugin)
  .use(servicesPlugin)
  .get(
    "/",
    async ({ db, query }) => {
      const limit = query.limit ? Math.min(Number(query.limit), 500) : 100;
      const offset = query.offset ? Number(query.offset) : 0;

      const rows = await db
        .select()
        .from(schema.market)
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
    async ({ body, economyService }) => {
      const result = await economyService.sellInventory(
        body.inventoryId,
        body.ownerId,
        body.price,
      );
      logger.info(
        null,
        "listed item on market",
        `item:${body.inventoryId}`,
        `price:${body.price}`,
      );
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
    async ({ params, body, economyService }) => {
      const result = await economyService.buyMarket(
        params.id,
        body.newOwnerId,
        body.oldOwnerId,
      );
      logger.info(
        null,
        "bought market item",
        params.id,
        `buyer:${body.newOwnerId}`,
      );
      return result;
    },
    {
      body: t.Object({
        newOwnerId: t.String(),
        oldOwnerId: t.String(),
      }),
    },
  )
  .post("/:id/remove", async ({ params, economyService }) => {
    const result = await economyService.removeMarketListing(params.id);
    logger.info(null, "removed market listing", params.id);
    return result;
  })
  .post(
    "/:id/discount",
    async ({ params, body, economyService }) => {
      const result = await economyService.discountMarket(
        params.id,
        body.ownerId,
        body.price,
        body.discountPrice,
      );
      logger.info(
        null,
        "discounted market item",
        params.id,
        `${body.price}→${body.discountPrice}`,
      );
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
  .delete(
    "/:id",
    async ({ params, db }) => {
      await db.delete(schema.market).where(eq(schema.market.id, params.id));
      broadcast("market", "delete", params.id);
      logger.info(null, "deleted market listing", params.id);
      return { ok: true };
    },
    { params: t.Object({ id: t.String() }) },
  );
