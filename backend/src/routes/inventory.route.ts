import { Elysia, t } from "elysia";
import { and, desc, eq, not, type SQL } from "drizzle-orm";
import * as schema from "@/db/schema.db";
import { nowIso, withRecordMeta } from "@/lib/index.utils";
import { broadcast } from "@/lib/websocket.utils";
import Logger from "@/lib/logger.utils";
import servicesPlugin from "@/services.server";
import { authPlugin, databasePlugin } from "@/plugins/index.plugin";

const logger = new Logger("INVENTORY");

export default new Elysia({ prefix: "/inventory" })
  .use(databasePlugin)
  .use(servicesPlugin)
  .use(authPlugin)
  .get(
    "/history/:userId",
    async ({ params, db }) => {
      const rows = await db
        .select()
        .from(schema.inventoryLog)
        .where(eq(schema.inventoryLog.owner, params.userId))
        .orderBy(desc(schema.inventoryLog.created))
        .limit(1000);
      return rows;
    },
    { params: t.Object({ userId: t.String() }) },
  )
  .get(
    "/",
    async ({ db, query }) => {
      const limit = query.limit ? Math.min(Number(query.limit), 500) : 100;
      const offset = query.offset ? Number(query.offset) : 0;
      const conditions: SQL[] = [];

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
        conditions.push(eq(schema.inventory.label, query.search));
      }

      const q =
        conditions.length > 0
          ? db
              .select()
              .from(schema.inventory)
              .where(and(...conditions))
          : db.select().from(schema.inventory);

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
  .get(
    "/:id",
    async ({ params, db, set }) => {
      const [row] = await db
        .select()
        .from(schema.inventory)
        .where(eq(schema.inventory.id, params.id));
      if (!row) {
        set.status = 404;
        return { error: "Not found" };
      }
      return withRecordMeta(row, "inventory");
    },
    { params: t.Object({ id: t.String() }) },
  )
  .post(
    "/add",
    async ({ body, user, economyService }) => {
      const result = await economyService.addInventory(
        body.userId,
        body.itemId,
      );
      logger
        .setAuthor(user?.username ?? "SYSTEM")
        .info(
          `added item to inventory user:${body.userId} item:${body.itemId}`,
        );
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
      logger
        .setAuthor(user?.username ?? "SYSTEM")
        .info(`transferred inventory item ${params.id} to:${body.newOwner}`);
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
    async ({ params, user, effectService }) => {
      const result = await effectService.executeUse(user.sub, params.id);
      logger
        .setAuthor(String(user.username))
        .info(`used inventory item ${params.id}`);
      return result;
    },
    {
      requireAuth: true,
    },
  )
  .post(
    "/:id/charge",
    async ({ params, body, user, economyService }) => {
      const result = await economyService.chargeInventory(
        params.id,
        body.oldCharge,
        body.newCharge,
      );
      logger
        .setAuthor(user?.username ?? "SYSTEM")
        .info(
          `charged inventory item ${params.id} ${body.oldCharge}->${body.newCharge}`,
        );
      return result;
    },
    {
      body: t.Object({
        oldCharge: t.Number(),
        newCharge: t.Number(),
      }),
    },
  )
  .post(
    "/:id/consume",
    async ({
      params,
      body,
      db,
      user,
      set,
      economyService,
      userService,
      activityService,
      logService,
    }) => {
      const [inv] = await db
        .select()
        .from(schema.inventory)
        .where(eq(schema.inventory.id, params.id));
      if (!inv) {
        set.status = 404;
        return { error: "Предмет не найден" };
      }
      if (inv.owner !== user.sub) {
        set.status = 403;
        return { error: "Не ваш предмет" };
      }
      await economyService.chargeInventory(params.id, inv.charge, -1);
      const userData = await userService.getById(user.sub);
      await logService.log("use", params.id, user.sub, user.sub, {
        consume: true,
      });
      await activityService.create({
        author: user.sub,
        image: userData?.avatar ?? "",
        text: body.activityText,
      });
      logger
        .setAuthor(String(user.username))
        .info(`consumed inventory item ${params.id}`);
      return { ok: true };
    },
    {
      body: t.Object({
        activityText: t.String(),
      }),
      requireAuth: true,
    },
  )
  .delete(
    "/:id",
    async ({ params, db, user, logService }) => {
      const [inv] = await db
        .select()
        .from(schema.inventory)
        .where(eq(schema.inventory.id, params.id));
      await db
        .delete(schema.inventory)
        .where(eq(schema.inventory.id, params.id));
      if (inv) {
        await logService.logFromData(
          "delete",
          inv.id,
          inv.label,
          inv.type,
          inv.owner,
          user?.sub,
          { deletedBy: "user" },
        );
      }
      broadcast("inventory", "delete", params.id);
      logger
        .setAuthor(user?.username ?? "SYSTEM")
        .info(`deleted inventory item ${params.id}`);
      return { ok: true };
    },
    { params: t.Object({ id: t.String() }) },
  );
