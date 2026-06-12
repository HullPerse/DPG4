import { Elysia, t } from "elysia";
import { and, eq, sql } from "drizzle-orm";
import * as schema from "../db/schema";
import { newId } from "../lib/ids";
import { nowIso } from "../lib/dates";
import { broadcast } from "../lib/ws";
import { logger } from "../lib/logger";
import { dbPlugin } from "../plugins/db.plugin";
import { servicesPlugin } from "../services.server";
import { ITEM_DB_IDS, RAT_IDS } from "../items/constants";

const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

const DECAY_PER_HOUR = { hunger: 5, happiness: 3, energy: 4 };
const MAX_STAT = 100;
const MIN_STAT = 0;
const REWARD_THRESHOLD = 80;
const GOOD_STAT_MIN = 1;

function calcDecayed(stat: number, elapsedHours: number, decay: number): number {
  return Math.max(MIN_STAT, Math.round(stat - elapsedHours * decay));
}

export const petsRoute = new Elysia({ prefix: "/pets" })
  .use(dbPlugin)

  .get(
    "/:userId",
    async ({ params, db }) => {
      let pet = await db
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

        pet = await db
          .select()
          .from(schema.pets)
          .where(eq(schema.pets.id, id))
          .get();
      } else {
        const elapsedMs = new Date(now).getTime() - new Date(pet.lastUpdated).getTime();
        const elapsedHours = elapsedMs / (1000 * 60 * 60);

        const hunger = calcDecayed(pet.hunger, elapsedHours, DECAY_PER_HOUR.hunger);
        const happiness = calcDecayed(pet.happiness, elapsedHours, DECAY_PER_HOUR.happiness);
        const energy = calcDecayed(pet.energy, elapsedHours, DECAY_PER_HOUR.energy);

        await db
          .update(schema.pets)
          .set({
            hunger,
            happiness,
            energy,
            lastUpdated: now,
            updated: now,
          })
          .where(eq(schema.pets.id, pet.id));

        pet = await db
          .select()
          .from(schema.pets)
          .where(eq(schema.pets.id, pet.id))
          .get();
      }

      return pet;
    },
    {
      params: t.Object({ userId: t.String() }),
      detail: { tags: ["pets"], summary: "Get or create pet" },
    },
  )

  .post(
    "/:userId/feed",
    async ({ params, db }) => {
      const now = nowIso();
      const pet = await db
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
      logger.info("pets", "user fed pet", params.userId);

      return await db
        .select()
        .from(schema.pets)
        .where(eq(schema.pets.id, pet.id))
        .get();
    },
    {
      params: t.Object({ userId: t.String() }),
      detail: { tags: ["pets"], summary: "Feed the pet" },
    },
  )

  .post(
    "/:userId/pet",
    async ({ params, db }) => {
      const now = nowIso();
      const pet = await db
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
      logger.info("pets", "user petted pet", params.userId);

      return await db
        .select()
        .from(schema.pets)
        .where(eq(schema.pets.id, pet.id))
        .get();
    },
    {
      params: t.Object({ userId: t.String() }),
      detail: { tags: ["pets"], summary: "Pet the pet" },
    },
  )

  .post(
    "/:userId/sleep",
    async ({ params, db }) => {
      const now = nowIso();
      const pet = await db
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
      logger.info("pets", "user put pet to sleep", params.userId);

      return await db
        .select()
        .from(schema.pets)
        .where(eq(schema.pets.id, pet.id))
        .get();
    },
    {
      params: t.Object({ userId: t.String() }),
      detail: { tags: ["pets"], summary: "Put the pet to sleep" },
    },
  )

  .use(servicesPlugin)
  .post(
    "/:userId/daily-reward",
    async ({ params, db, economyService, userService }) => {
      const now = nowIso();
      const today = now.slice(0, 10);

      const pet = await db
        .select()
        .from(schema.pets)
        .where(eq(schema.pets.userId, params.userId))
        .get();

      if (!pet) throw new Error("Pet not found");

      if (pet.lastRewardDate === today) {
        return { claimed: false, reason: "already_claimed" };
      }

      const elapsedMs = new Date(now).getTime() - new Date(pet.lastUpdated).getTime();
      const elapsedHours = elapsedMs / (1000 * 60 * 60);

      const hunger = calcDecayed(pet.hunger, elapsedHours, DECAY_PER_HOUR.hunger);
      const happiness = calcDecayed(pet.happiness, elapsedHours, DECAY_PER_HOUR.happiness);
      const energy = calcDecayed(pet.energy, elapsedHours, DECAY_PER_HOUR.energy);

      if (hunger < REWARD_THRESHOLD || happiness < REWARD_THRESHOLD || energy < REWARD_THRESHOLD) {
        return { claimed: false, reason: "stats_too_low", hunger, happiness, energy };
      }

      const isMoney = Math.random() < 0.5;
      let moneyAmount = 0;
      let itemLabel = "";
      let itemId = "";

      if (isMoney) {
        moneyAmount = Math.floor(Math.random() * 8) + 1;
        await userService.score(params.userId, moneyAmount);
        logger.info("pets", "daily reward money", params.userId, moneyAmount);
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
        logger.info("pets", "daily reward item", params.userId, item.label);
      }

      const updateData: Record<string, unknown> = { lastRewardDate: today, updated: now };

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
      detail: { tags: ["pets"], summary: "Claim daily reward if pet is well cared for" },
    },
  )

  .post(
    "/:userId/resurrect",
    async ({ params, db, economyService }) => {
      const now = nowIso();
      const pet = await db
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
      logger.info("pets", "resurrected pet", params.userId);

      const updated = await db
        .select()
        .from(schema.pets)
        .where(eq(schema.pets.id, pet.id))
        .get();

      return { ok: true, pet: updated };
    },
    {
      params: t.Object({ userId: t.String() }),
      detail: { tags: ["pets"], summary: "Resurrect pet with a Крыса item" },
    },
  )

  .post(
    "/:userId/search",
    async ({ params, db, economyService }) => {
      const now = nowIso();
      const today = now.slice(0, 10);
      const pet = await db
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
      logger.info("pets", "searched dead pet", params.userId);

      return { ok: true, itemLabel: anusItem.label, itemId: anusItem.id };
    },
    {
      params: t.Object({ userId: t.String() }),
      detail: { tags: ["pets"], summary: "Search the dead pet for loot" },
    },
  )

  .post(
    "/:userId/color",
    async ({ params, db, body }) => {
      if (!HEX_COLOR_REGEX.test(body.color)) {
        throw new Error("Invalid color format. Must be a hex color like #FF0000");
      }

      const now = nowIso();
      const pet = await db
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
      logger.info("pets", "changed pet color", params.userId, body.color);

      return await db
        .select()
        .from(schema.pets)
        .where(eq(schema.pets.id, pet.id))
        .get();
    },
    {
      params: t.Object({ userId: t.String() }),
      body: t.Object({ color: t.String() }),
      detail: { tags: ["pets"], summary: "Change pet color" },
    },
  );
