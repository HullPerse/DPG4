import { Elysia, t } from "elysia";
import { and, eq } from "drizzle-orm";
import * as schema from "@/db/schema.db";
import { newId, nowIso, getUser } from "@/lib/index.utils";
import { broadcast } from "@/lib/websocket.utils";
import Logger from "@/lib/logger.utils";
import servicesPlugin from "@/services.server";
import { ITEM_DB_IDS, RAT_IDS } from "@/lib/items/constants";
import { databasePlugin } from "@/plugins/index.plugin";
import PetService, {
  calcDecayed,
  DECAY_PER_HOUR,
} from "@/services/pet.service";

const logger = new Logger("PETS");
const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;
const MAX_STAT = 100;
const REWARD_THRESHOLD = 80;

const petService = new PetService();
petService.startDecayLoop();

export default new Elysia({ prefix: "/pets" })
  .use(databasePlugin)
  .use(servicesPlugin)

  .get(
    "/:userId",
    async ({ params, db }) => {
      let pet = db
        .select()
        .from(schema.pets)
        .where(eq(schema.pets.userId, params.userId))
        .get();

      const now = nowIso();

      if (!pet) {
        const id = newId();
        await db.insert(schema.pets).values({
          id,
          userId: params.userId,
          hunger: MAX_STAT,
          happiness: MAX_STAT,
          energy: MAX_STAT,
          isAlive: true,
          lastUpdated: now,
          created: now,
          updated: now,
        });

        pet = db.select().from(schema.pets).where(eq(schema.pets.id, id)).get();
      } else {
        const elapsedMs =
          new Date(now).getTime() - new Date(pet.lastUpdated).getTime();
        const elapsedHours = elapsedMs / (1000 * 60 * 60);

        const hunger = calcDecayed(
          pet.hunger,
          elapsedHours,
          DECAY_PER_HOUR.hunger,
        );
        const happiness = calcDecayed(
          pet.happiness,
          elapsedHours,
          DECAY_PER_HOUR.happiness,
        );
        const energy = calcDecayed(
          pet.energy,
          elapsedHours,
          DECAY_PER_HOUR.energy,
        );

        await db
          .update(schema.pets)
          .set({ hunger, happiness, energy, lastUpdated: now, updated: now })
          .where(eq(schema.pets.id, pet.id));

        pet = db
          .select()
          .from(schema.pets)
          .where(eq(schema.pets.id, pet.id))
          .get();
      }

      return pet;
    },
    {
      params: t.Object({ userId: t.String() }),
    },
  )

  .post(
    "/:userId/feed",
    async ({ params, db }) => {
      const now = nowIso();
      const pet = db
        .select()
        .from(schema.pets)
        .where(eq(schema.pets.userId, params.userId))
        .get();

      if (!pet) throw new Error("Pet not found");

      await db
        .update(schema.pets)
        .set({ hunger: MAX_STAT, lastUpdated: now, updated: now })
        .where(eq(schema.pets.id, pet.id));

      broadcast("pets", "update", params.userId);
      const feedUser = await getUser(db, params.userId);
      logger.setAuthor(feedUser?.username ?? "SYSTEM").info("fed pet");

      return db
        .select()
        .from(schema.pets)
        .where(eq(schema.pets.id, pet.id))
        .get();
    },
    {
      params: t.Object({ userId: t.String() }),
    },
  )

  .post(
    "/:userId/pet",
    async ({ params, db }) => {
      const now = nowIso();
      const pet = db
        .select()
        .from(schema.pets)
        .where(eq(schema.pets.userId, params.userId))
        .get();

      if (!pet) throw new Error("Pet not found");

      await db
        .update(schema.pets)
        .set({ happiness: MAX_STAT, lastUpdated: now, updated: now })
        .where(eq(schema.pets.id, pet.id));

      broadcast("pets", "update", params.userId);
      const petUser = await getUser(db, params.userId);
      logger.setAuthor(petUser?.username ?? "SYSTEM").info("petted pet");

      return db
        .select()
        .from(schema.pets)
        .where(eq(schema.pets.id, pet.id))
        .get();
    },
    {
      params: t.Object({ userId: t.String() }),
    },
  )

  .post(
    "/:userId/sleep",
    async ({ params, db }) => {
      const now = nowIso();
      const pet = db
        .select()
        .from(schema.pets)
        .where(eq(schema.pets.userId, params.userId))
        .get();

      if (!pet) throw new Error("Pet not found");

      await db
        .update(schema.pets)
        .set({ energy: MAX_STAT, lastUpdated: now, updated: now })
        .where(eq(schema.pets.id, pet.id));

      broadcast("pets", "update", params.userId);
      const sleepUser = await getUser(db, params.userId);
      logger
        .setAuthor(sleepUser?.username ?? "SYSTEM")
        .info("put pet to sleep");

      return db
        .select()
        .from(schema.pets)
        .where(eq(schema.pets.id, pet.id))
        .get();
    },
    {
      params: t.Object({ userId: t.String() }),
    },
  )

  .post(
    "/:userId/daily-reward",
    async ({ params, db, economyService, userService }) => {
      const now = nowIso();
      const today = now.slice(0, 10);

      const pet = db
        .select()
        .from(schema.pets)
        .where(eq(schema.pets.userId, params.userId))
        .get();

      if (!pet) throw new Error("Pet not found");

      if (pet.lastRewardDate === today) {
        return { claimed: false, reason: "already_claimed" };
      }

      const elapsedMs =
        new Date(now).getTime() - new Date(pet.lastUpdated).getTime();
      const elapsedHours = elapsedMs / (1000 * 60 * 60);

      const hunger = calcDecayed(
        pet.hunger,
        elapsedHours,
        DECAY_PER_HOUR.hunger,
      );
      const happiness = calcDecayed(
        pet.happiness,
        elapsedHours,
        DECAY_PER_HOUR.happiness,
      );
      const energy = calcDecayed(
        pet.energy,
        elapsedHours,
        DECAY_PER_HOUR.energy,
      );

      if (
        hunger < REWARD_THRESHOLD ||
        happiness < REWARD_THRESHOLD ||
        energy < REWARD_THRESHOLD
      ) {
        return {
          claimed: false,
          reason: "stats_too_low",
          hunger,
          happiness,
          energy,
        };
      }

      const isMoney = Math.random() < 0.5;
      let moneyAmount = 0;
      let itemLabel = "";
      let itemId = "";

      const rewardUser = await getUser(db, params.userId);

      if (isMoney) {
        moneyAmount = Math.floor(Math.random() * 8) + 1;
        await userService.score(params.userId, moneyAmount);
        logger
          .setAuthor(rewardUser?.username ?? "SYSTEM")
          .info(`daily reward money ${moneyAmount}`);
      } else {
        const randomLabel = RAT_IDS[Math.floor(Math.random() * RAT_IDS.length)];
        const [item] = await db
          .select()
          .from(schema.items)
          .where(eq(schema.items.label, randomLabel))
          .limit(1);

        if (!item) {
          return { claimed: false, reason: "item_not_found" };
        }

        await economyService.addInventory(params.userId, item.id);
        itemLabel = item.label;
        itemId = item.id;
        broadcast("pets", "update", params.userId);
        logger
          .setAuthor(rewardUser?.username ?? "SYSTEM")
          .info(`daily reward item ${item.label}`);
      }

      const updateData: Record<string, unknown> = {
        lastRewardDate: today,
        updated: now,
      };

      if (pet.kvasBuff) {
        const [kalItem] = await db
          .select()
          .from(schema.items)
          .where(eq(schema.items.id, ITEM_DB_IDS.poop))
          .limit(1);
        if (kalItem) {
          await economyService.addInventory(params.userId, kalItem.id);
          broadcast("inventory", "add", params.userId);
        }
        updateData.kvasBuff = false;
      }

      await db
        .update(schema.pets)
        .set(updateData)
        .where(eq(schema.pets.id, pet.id));

      if (isMoney) {
        return { claimed: true, reward: "money" as const, amount: moneyAmount };
      }
      return { claimed: true, reward: "item" as const, itemLabel, itemId };
    },
    {
      params: t.Object({ userId: t.String() }),
    },
  )

  .post(
    "/:userId/resurrect",
    async ({ params, db, economyService }) => {
      const now = nowIso();
      const pet = db
        .select()
        .from(schema.pets)
        .where(eq(schema.pets.userId, params.userId))
        .get();

      if (!pet) throw new Error("Pet not found");
      if (pet.isAlive) throw new Error("Pet is already alive");

      const ratItems = await db
        .select()
        .from(schema.inventory)
        .where(
          and(
            eq(schema.inventory.owner, params.userId),
            eq(schema.inventory.label, "Крыса"),
          ),
        )
        .limit(1);

      if (ratItems.length === 0) {
        return { ok: false, reason: "no_rat_item" };
      }

      await economyService.removeInventoryById(ratItems[0].id);
      broadcast("inventory", "delete", ratItems[0].id);

      await db
        .update(schema.pets)
        .set({ isAlive: true, updated: now })
        .where(eq(schema.pets.id, pet.id));

      broadcast("pets", "update", params.userId);
      const resurrectUser = await getUser(db, params.userId);
      logger
        .setAuthor(resurrectUser?.username ?? "SYSTEM")
        .info("resurrected pet");

      const updated = db
        .select()
        .from(schema.pets)
        .where(eq(schema.pets.id, pet.id))
        .get();

      return { ok: true, pet: updated };
    },
    {
      params: t.Object({ userId: t.String() }),
    },
  )

  .post(
    "/:userId/search",
    async ({ params, db, economyService }) => {
      const now = nowIso();
      const today = now.slice(0, 10);
      const pet = db
        .select()
        .from(schema.pets)
        .where(eq(schema.pets.userId, params.userId))
        .get();

      if (!pet) throw new Error("Pet not found");
      if (pet.isAlive) throw new Error("Pet is alive");
      if (pet.lastSearchDate === today) {
        return { ok: false, reason: "already_searched" };
      }

      const [anusItem] = await db
        .select()
        .from(schema.items)
        .where(eq(schema.items.id, ITEM_DB_IDS.krysinyAnus))
        .limit(1);

      if (!anusItem) {
        return { ok: false, reason: "item_not_found" };
      }

      await economyService.addInventory(params.userId, anusItem.id);
      broadcast("inventory", "add", params.userId);

      await db
        .update(schema.pets)
        .set({ lastSearchDate: today, updated: now })
        .where(eq(schema.pets.id, pet.id));

      broadcast("pets", "update", params.userId);
      const searchUser = await getUser(db, params.userId);
      logger
        .setAuthor(searchUser?.username ?? "SYSTEM")
        .info("searched dead pet");

      return { ok: true, itemLabel: anusItem.label, itemId: anusItem.id };
    },
    {
      params: t.Object({ userId: t.String() }),
    },
  )

  .post(
    "/:userId/color",
    async ({ params, db, body }) => {
      if (!HEX_COLOR_REGEX.test(body.color)) {
        throw new Error(
          "Invalid color format. Must be a hex color like #FF0000",
        );
      }

      const now = nowIso();
      const pet = db
        .select()
        .from(schema.pets)
        .where(eq(schema.pets.userId, params.userId))
        .get();

      if (!pet) throw new Error("Pet not found");

      await db
        .update(schema.pets)
        .set({ color: body.color, updated: now })
        .where(eq(schema.pets.id, pet.id));

      broadcast("pets", "update", params.userId);
      const colorUser = await getUser(db, params.userId);
      logger
        .setAuthor(colorUser?.username ?? "SYSTEM")
        .info(`changed pet color ${body.color}`);

      return db
        .select()
        .from(schema.pets)
        .where(eq(schema.pets.id, pet.id))
        .get();
    },
    {
      params: t.Object({ userId: t.String() }),
      body: t.Object({ color: t.String() }),
    },
  )

  .post(
    "/:userId/model",
    async ({ params, db, body }) => {
      const VALID_MODELS = ["rat", "dingus"];
      if (!VALID_MODELS.includes(body.model)) {
        throw new Error("Invalid model. Must be one of: rat, dingus");
      }

      const now = nowIso();
      const pet = db
        .select()
        .from(schema.pets)
        .where(eq(schema.pets.userId, params.userId))
        .get();

      if (!pet) throw new Error("Pet not found");

      await db
        .update(schema.pets)
        .set({ model: body.model, updated: now })
        .where(eq(schema.pets.id, pet.id));

      broadcast("pets", "update", params.userId);
      const modelUser = await getUser(db, params.userId);
      logger
        .setAuthor(modelUser?.username ?? "SYSTEM")
        .info(`changed pet model ${body.model}`);

      return db
        .select()
        .from(schema.pets)
        .where(eq(schema.pets.id, pet.id))
        .get();
    },
    {
      params: t.Object({ userId: t.String() }),
      body: t.Object({ model: t.String() }),
    },
  );
