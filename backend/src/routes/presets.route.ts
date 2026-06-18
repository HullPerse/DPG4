import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema";
import { newId } from "../lib/ids";
import { nowIso } from "../lib/dates";
import { withRecordMeta } from "../lib/record";
import { broadcast } from "../lib/ws";
import { logger } from "../lib/logger";
import { dbPlugin } from "../plugins/db.plugin";

const presetCreateBody = t.Object({
  label: t.String(),
});

const presetPatchBody = t.Object({
  label: t.Optional(t.String()),
  games: t.Optional(t.Array(t.Any())),
});

export const presetsRoute = new Elysia({ prefix: "/presets" })
  .use(dbPlugin)
  .get(
    "/",
    async ({ db, query }) => {
      const all = await db.select().from(schema.presets);
      const searchLower = query.search?.toLowerCase();
      const matched = searchLower
        ? all.filter((r) => r.label?.toLowerCase().includes(searchLower))
        : all;
      return matched.map((r) => withRecordMeta(r, "presets"));
    },
    {
      query: t.Optional(
        t.Object({
          search: t.Optional(t.String()),
        }),
      ),
    },
  )
  .get(
    "/:id",
    async ({ params, db, set }) => {
      const [row] = await db
        .select()
        .from(schema.presets)
        .where(eq(schema.presets.id, params.id));
      if (!row) {
        set.status = 404;
        return { error: "Not found" };
      }
      return withRecordMeta(row, "presets");
    },
    { params: t.Object({ id: t.String() }) },
  )
  .post(
    "/",
    async ({ body, db }) => {
      const id = newId();
      const ts = nowIso();
      await db.insert(schema.presets).values({
        id,
        label: body.label,
        games: [],
        created: ts,
        updated: ts,
      });
      broadcast("presets", "create", id);
      logger.info(null, "created preset", body.label);
      return withRecordMeta(
        { id, label: body.label, games: [], created: ts, updated: ts },
        "presets",
      );
    },
    { body: presetCreateBody },
  )
  .patch(
    "/:id",
    async ({ params, body, db }) => {
      const patch: Partial<typeof schema.presets.$inferInsert> = {
        updated: nowIso(),
      };
      if (body.label !== undefined) patch.label = body.label;
      if (body.games !== undefined) patch.games = body.games;

      await db
        .update(schema.presets)
        .set(patch)
        .where(eq(schema.presets.id, params.id));
      broadcast("presets", "update", params.id);
      const [row] = await db
        .select()
        .from(schema.presets)
        .where(eq(schema.presets.id, params.id));
      logger.info(null, "updated preset", row?.label ?? params.id);
      return withRecordMeta(row!, "presets");
    },
    { body: presetPatchBody },
  )
  .delete(
    "/:id",
    async ({ params, db }) => {
      await db.delete(schema.presets).where(eq(schema.presets.id, params.id));
      broadcast("presets", "delete", params.id);
      logger.info(null, "deleted preset", params.id);
      return { ok: true };
    },
    { params: t.Object({ id: t.String() }) },
  );
