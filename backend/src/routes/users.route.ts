import { Elysia, t } from "elysia";
import { and, eq, like, not, sql } from "drizzle-orm";
import * as schema from "@/db/schema.db";
import authPlugin from "@/plugins/auth.plugin";
import {
  nowIso,
  omitPassword,
  withRecordMeta,
  USER_ACTIONS,
} from "@/lib/index.utils";
import { broadcast } from "@/lib/websocket.utils";
import Logger from "@/lib/logger.utils";
import servicesPlugin from "@/services.server";
import databasePlugin from "@/plugins/database.plugin";

const logger = new Logger("USERS");

const usersRoute = new Elysia({ prefix: "/users" })
  .use(databasePlugin)
  .use(servicesPlugin)
  .use(authPlugin)
  .get(
    "/",
    async ({ db, query }) => {
      const limit = query.limit ? Math.min(Number(query.limit), 500) : 100;
      const offset = query.offset ? Number(query.offset) : 0;
      const conditions = [];

      if (query.excludeUserId) {
        conditions.push(not(eq(schema.users.id, query.excludeUserId)));
      }

      if (query.hasStatus) {
        conditions.push(
          sql`${schema.users.status} LIKE ${`%"${query.hasStatus}"%`}`,
        );
      }

      if (query.search) {
        conditions.push(like(schema.users.username, `%${query.search}%`));
      }

      const q =
        conditions.length > 0
          ? db
              .select()
              .from(schema.users)
              .where(and(...conditions))
          : db.select().from(schema.users);

      const rows = await q.limit(limit).offset(offset);
      let list = rows.map((row) => withRecordMeta(omitPassword(row), "users"));

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
      query: t.Optional(
        t.Object({
          search: t.Optional(t.String()),
          excludeUserId: t.Optional(t.String()),
          hasStatus: t.Optional(t.String()),
          fields: t.Optional(t.String()),
          limit: t.Optional(t.String()),
          offset: t.Optional(t.String()),
        }),
      ),
    },
  )
  .get(
    "/:id",
    async ({ params, set, userService }) => {
      const user = await userService.getById(params.id);
      if (!user) {
        set.status = 404;
        return { error: "Not found" };
      }
      return user;
    },
    {
      params: t.Object({ id: t.String() }),
    },
  )
  .patch(
    "/:id",
    async ({ params, body, db, user, userService }) => {
      const {
        password: _pw,
        passwordHash: _ph,
        id: _id,
        created: _cr,
        ...rest
      } = body;
      await db
        .update(schema.users)
        .set({ ...rest, updated: nowIso() } as Partial<
          typeof schema.users.$inferInsert
        >)
        .where(eq(schema.users.id, params.id));
      broadcast("users", "update", params.id);
      logger
        .setAuthor(String(user?.username))
        .info(`updated profile ${params.id}`);
      return userService.getById(params.id);
    },
    {
      body: t.Record(t.String(), t.Any()),
    },
  )
  .post(
    "/:id/status",
    async ({ params, body, user, userService }) => {
      const result = await userService.changeStatus(
        params.id,
        body.status,
        body.type,
      );
      logger
        .setAuthor(String(user?.username))
        .info(`changed status ${params.id} ${body.type}:${body.status}`);
      return result;
    },
    {
      body: t.Object({
        status: t.String(),
        type: t.Union([t.Literal("add"), t.Literal("remove")]),
      }),
    },
  )
  .post(
    "/:id/score",
    async ({ params, body, user, userService }) => {
      const result = await userService.score(params.id, body.score, body.trade);
      logger
        .setAuthor(String(user?.username))
        .info(
          `changed score ${params.id} ${body.score > 0 ? `+${body.score}` : String(body.score)}`,
        );
      return result;
    },
    {
      body: t.Object({
        score: t.Number(),
        trade: t.Optional(t.Boolean()),
      }),
    },
  )
  .post(
    "/:id/dice",
    async ({ params, body, user, userService }) => {
      const result = await userService.changeDice(
        params.id,
        body.realTime,
        body.action,
      );
      logger
        .setAuthor(String(user?.username))
        .info(`changed dice ${params.id} ${body.action}`);
      return result;
    },
    {
      body: t.Object({
        realTime: t.Number(),
        action: t.Union([
          t.Literal(USER_ACTIONS.MOVE_POSITIVE),
          t.Literal(USER_ACTIONS.MOVE_NEGATIVE),
        ]),
      }),
    },
  )
  .post("/:id/place", async ({ params, user, userService }) => {
    const result = await userService.updatePlace(params.id);
    logger
      .setAuthor(String(user?.username))
      .info(`assigned place ${params.id}`);
    return result;
  })
  .delete("/:id/place", async ({ params, db, user, userService }) => {
    await db
      .update(schema.users)
      .set({ place: "0", updated: nowIso() })
      .where(eq(schema.users.id, params.id));
    broadcast("users", "update", params.id);
    logger.setAuthor(String(user?.username)).info(`cleared place ${params.id}`);
    return userService.getById(params.id);
  });

export default usersRoute;
