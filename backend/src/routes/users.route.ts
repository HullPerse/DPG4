import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema";
import { authPlugin } from "../plugins/auth.plugin";
import { nowIso } from "../lib/dates";
import { omitPassword, withRecordMeta } from "../lib/record";
import { broadcast } from "../lib/ws";
import { logger } from "../lib/logger";
import { dbPlugin } from "../plugins/db.plugin";
import {
  changeUserDice,
  changeUserStatus,
  getUserById,
  scoreUser,
  updatePlace,
} from "../services/user.service";

export const usersRoute = new Elysia({ prefix: "/users" })
  .use(dbPlugin)
  .use(authPlugin)
  .get(
    "/",
    async ({ db, query }) => {
      const rows = await db.select().from(schema.users);
      let list = rows.map((r) => withRecordMeta(omitPassword(r), "users"));

      if (query.fields) {
        const fields = query.fields.split(",").map((f) => f.trim());
        list = list.map((u) => {
          const picked: Record<string, unknown> = { id: u.id };
          for (const f of fields) {
            if (f in u) picked[f] = (u as Record<string, unknown>)[f];
          }
          return picked as typeof u;
        });
      }
      return list;
    },
    {
      query: t.Optional(t.Object({ fields: t.Optional(t.String()) })),
      detail: { tags: ["users"], summary: "List users" },
    },
  )
  .get(
    "/:id",
    async ({ params, db, set }) => {
      const user = await getUserById(db, params.id);
      if (!user) {
        set.status = 404;
        return { error: "Not found" };
      }
      return user;
    },
    { detail: { tags: ["users"], summary: "Get user by id" } },
  )
  .patch(
    "/:id",
    async ({ params, body, db, user }) => {
      const { password: _pw, passwordHash: _ph, id: _id, created: _cr, ...rest } = body;
      await db
        .update(schema.users)
        .set({ ...rest, updated: nowIso() } as Partial<typeof schema.users.$inferInsert>)
        .where(eq(schema.users.id, params.id));
      broadcast("users", "update", params.id);
      logger.info(user?.username, "updated profile", params.id);
      return getUserById(db, params.id);
    },
    {
      body: t.Record(t.String(), t.Any()),
      detail: { tags: ["users"], summary: "Update user fields" },
    },
  )
  .post(
    "/:id/status",
    async ({ params, body, db, user }) => {
      const result = await changeUserStatus(db, params.id, body.status, body.type);
      logger.info(user?.username, "changed status", params.id, `${body.type}:${body.status}`);
      return result;
    },
    {
      body: t.Object({
        status: t.String(),
        type: t.Union([t.Literal("add"), t.Literal("remove")]),
      }),
      detail: { tags: ["users"], summary: "Add/remove status effect" },
    },
  )
  .post(
    "/:id/score",
    async ({ params, body, db, user }) => {
      const result = await scoreUser(db, params.id, body.score, body.trade);
      logger.info(user?.username, "changed score", params.id, body.score > 0 ? `+${body.score}` : String(body.score));
      return result;
    },
    {
      body: t.Object({
        score: t.Number(),
        trade: t.Optional(t.Boolean()),
      }),
      detail: { tags: ["users"], summary: "Change user money (server rules)" },
    },
  )
  .post(
    "/:id/dice",
    async ({ params, body, db, user }) => {
      const result = await changeUserDice(db, params.id, body.realTime, body.action);
      logger.info(user?.username, "changed dice", params.id, body.action);
      return result;
    },
    {
      body: t.Object({
        realTime: t.Number(),
        action: t.Union([
          t.Literal("MOVE_POSITIVE"),
          t.Literal("MOVE_NEGATIVE"),
        ]),
      }),
      detail: { tags: ["users"], summary: "Update dice by playtime" },
    },
  )
  .post(
    "/:id/place",
    async ({ params, db, user }) => {
      const result = await updatePlace(db, params.id);
      logger.info(user?.username, "assigned place", params.id);
      return result;
    },
    { detail: { tags: ["users"], summary: "Assign podium place" } },
  )
  .delete(
    "/:id/place",
    async ({ params, db, user }) => {
      await db
        .update(schema.users)
        .set({ place: "0", updated: nowIso() })
        .where(eq(schema.users.id, params.id));
      broadcast("users", "update", params.id);
      logger.info(user?.username, "cleared place", params.id);
      return getUserById(db, params.id);
    },
    { detail: { tags: ["users"], summary: "Clear podium place" } },
  );
