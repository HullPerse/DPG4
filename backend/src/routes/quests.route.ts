import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema.db";
import { newId, nowIso, withRecordMeta } from "@/lib/index.utils";
import { broadcast } from "@/lib/websocket.utils";
import Logger from "@/lib/logger.utils";
import databasePlugin from "@/plugins/database.plugin";
import servicesPlugin from "@/services.server";
import authPlugin from "@/plugins/auth.plugin";

const logger = new Logger("QUESTS");

export default new Elysia({ prefix: "/quests" })
  .use(databasePlugin)
  .use(servicesPlugin)
  .get("/", async ({ db }) => {
    const rows = await db
      .select()
      .from(schema.quests)
      .orderBy(schema.quests.created);
    return rows.map((r) => withRecordMeta(r, "quests"));
  })
  .get(
    "/:id",
    async ({ params, db, set }) => {
      const [row] = await db
        .select()
        .from(schema.quests)
        .where(eq(schema.quests.id, params.id));
      if (!row) {
        set.status = 404;
        return { error: "Not found" };
      }
      return withRecordMeta(row, "quests");
    },
    { params: t.Object({ id: t.String() }) },
  )
  .post(
    "/",
    async ({ body, db }) => {
      const id = newId();
      const ts = nowIso();
      await db.insert(schema.quests).values({
        id,
        label: body.label,
        description: body.description ?? "",
        reward: body.reward ?? [],
        claimed: [],
        created: ts,
        updated: ts,
      });
      broadcast("quests", "create", id);
      logger.info(`created quest ${body.label}`);
      const [row] = await db
        .select()
        .from(schema.quests)
        .where(eq(schema.quests.id, id));
      return withRecordMeta(row!, "quests");
    },
    {
      body: t.Object({
        label: t.String(),
        description: t.Optional(t.String()),
        reward: t.Optional(
          t.Array(
            t.Object({
              type: t.Union([t.Literal("item"), t.Literal("money")]),
              value: t.Union([t.String(), t.Number()]),
            }),
          ),
        ),
      }),
    },
  )
  .patch(
    "/:id",
    async ({ params, body, db }) => {
      const patch: Partial<typeof schema.quests.$inferInsert> = {
        updated: nowIso(),
      };
      if (body.label !== undefined) patch.label = body.label;
      if (body.description !== undefined) patch.description = body.description;
      if (body.reward !== undefined) patch.reward = body.reward;
      if (body.claimed !== undefined) patch.claimed = body.claimed;
      await db
        .update(schema.quests)
        .set(patch)
        .where(eq(schema.quests.id, params.id));
      broadcast("quests", "update", params.id);
      const [row] = await db
        .select()
        .from(schema.quests)
        .where(eq(schema.quests.id, params.id));
      logger.info(`updated quest ${row?.label ?? params.id}`);
      return withRecordMeta(row!, "quests");
    },
    {
      body: t.Object({
        label: t.Optional(t.String()),
        description: t.Optional(t.String()),
        reward: t.Optional(
          t.Array(
            t.Object({
              type: t.Union([t.Literal("item"), t.Literal("money")]),
              value: t.Union([t.String(), t.Number()]),
            }),
          ),
        ),
        claimed: t.Optional(t.Array(t.String())),
      }),
    },
  )
  .delete(
    "/:id",
    async ({ params, db }) => {
      await db.delete(schema.quests).where(eq(schema.quests.id, params.id));
      broadcast("quests", "delete", params.id);
      logger.info(`deleted quest ${params.id}`);
      return { ok: true };
    },
    { params: t.Object({ id: t.String() }) },
  )
  .use(authPlugin)
  .post(
    "/:id/claim",
    async ({ params, user, db, userService, economyService }) => {
      const [quest] = await db
        .select()
        .from(schema.quests)
        .where(eq(schema.quests.id, params.id));
      if (!quest) return { error: "Quest not found" };
      const claimed = quest.claimed as string[];
      if (claimed.includes(String(user.id)))
        return { error: "Already claimed" };
      const rewards = quest.reward as {
        type: string;
        value: string | number;
      }[];
      for (const reward of rewards) {
        if (reward.type === "money") {
          await userService.score(String(user.id), Number(reward.value));
        } else if (reward.type === "item") {
          await economyService.addInventory(
            String(user.id),
            String(reward.value),
          );
        }
      }
      await db
        .update(schema.quests)
        .set({ claimed: [...claimed, String(user.id)], updated: nowIso() })
        .where(eq(schema.quests.id, params.id));
      broadcast("quests", "claim", params.id);
      broadcast("users", "update", user.id);
      broadcast("inventory", "add", user.id);
      logger
        .setAuthor(String(user.username))
        .info(`claimed quest ${params.id}`);
      return { ok: true, rewards };
    },
    { params: t.Object({ id: t.String() }), requireAuth: true },
  );
