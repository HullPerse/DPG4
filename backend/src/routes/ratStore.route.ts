import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema.db";
import { withRecordMeta, getUser } from "@/lib/index.utils";
import Logger from "@/lib/logger.utils";
import dbPlugin from "@/plugins/database.plugin";
import servicesPlugin from "@/services.server";
import { RAT_IDS } from "@/lib/items/constants";

const logger = new Logger("RAT_STORE");

const exchangeColumns = {
  id: schema.items.id,
  type: schema.items.type,
  label: schema.items.label,
  description: schema.items.description,
  charge: schema.items.charge,
  rollable: schema.items.rollable,
  status: schema.items.status,
  imageMime: schema.items.imageMime,
  created: schema.items.created,
  updated: schema.items.updated,
};

export default new Elysia({ prefix: "/rat-store" })
  .use(dbPlugin)
  .use(servicesPlugin)

  .get("/rat-labels", () => {
    return { labels: RAT_IDS };
  })

  .post(
    "/exchange",
    async ({ body, db, economyService, set }) => {
      const { userId, inventoryId } = body;

      const [invItem] = await db
        .select()
        .from(schema.inventory)
        .where(eq(schema.inventory.id, inventoryId));

      if (!invItem) {
        set.status = 404;
        return { error: "Предмет не найден" };
      }

      if (invItem.owner !== userId) {
        set.status = 403;
        return { error: "Не ваш предмет" };
      }

      await economyService.removeInventoryById(inventoryId);

      const allItems = await db.select(exchangeColumns).from(schema.items);

      if (allItems.length === 0) {
        set.status = 500;
        return { error: "Нет доступных предметов" };
      }

      const randomItem = allItems[Math.floor(Math.random() * allItems.length)];

      await economyService.addInventory(userId, randomItem.id);

      const exchangeUser = await getUser(db, userId);
      logger
        .setAuthor(exchangeUser?.username ?? "SYSTEM")
        .info(`traded ${invItem.label} → ${randomItem.label}`);

      return withRecordMeta(randomItem, "items");
    },
    {
      body: t.Object({
        userId: t.String(),
        inventoryId: t.String(),
      }),
    },
  );
