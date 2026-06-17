import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema";
import { newId } from "../lib/ids";
import { nowIso } from "../lib/dates";
import { withRecordMeta } from "../lib/record";
import { broadcast } from "../lib/ws";
import { logger } from "../lib/logger";
import { dbPlugin } from "../plugins/db.plugin";

export const questsRoute = new Elysia({ prefix: "/quests" })
  .use(dbPlugin)
  .get(
    "/",
    async ({ db }) => {
      const rows = await db
        .select()
        .from(schema.quests)
        .orderBy(schema.quests.created);
      return rows.map((r) => withRecordMeta(r, "quests"));
    },
  )
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
      logger.info(null, "created quest", body.label);
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
      logger.info(null, "updated quest", row?.label ?? params.id);
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
      logger.info(null, "deleted quest", params.id);
      return { ok: true };
    },
    { params: t.Object({ id: t.String() }) },
  )
  .post(
    "/:id/claim",
    async ({ params, body, db }) => {
      const [quest] = await db
        .select()
        .from(schema.quests)
        .where(eq(schema.quests.id, params.id));
      if (!quest) {
        return { error: "Quest not found" };
      }
      const claimed = quest.claimed as string[];
      if (claimed.includes(body.userId)) {
        return { error: "Already claimed" };
      }
      await db
        .update(schema.quests)
        .set({
          claimed: [...claimed, body.userId],
          updated: nowIso(),
        })
        .where(eq(schema.quests.id, params.id));
      broadcast("quests", "claim", params.id);
      logger.info(null, "claimed quest", params.id, `by ${body.userId}`);
      return { ok: true };
    },
    {
      body: t.Object({
        userId: t.String(),
      }),
    },
  );
