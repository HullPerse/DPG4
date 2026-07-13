import { Elysia, t } from "elysia";
import { and, eq, like, not, sql } from "drizzle-orm";
import * as schema from "@/db/schema.db";
import { authPlugin, databasePlugin } from "@/plugins/index.plugin";
import {
  nowIso,
  omitPassword,
  withRecordMeta,
  USER_ACTIONS,
} from "@/lib/index.utils";
import { broadcast } from "@/lib/websocket.utils";
import Logger from "@/lib/logger.utils";
import servicesPlugin from "@/services.server";
import { calculateMovePath } from "@/lib/cell.utils";
import type { CellPath } from "@/types/gambling";

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

      const rows = await q.orderBy(schema.users.username).limit(limit).offset(offset);
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
    async ({ params, body, db, user, userService, set }) => {
      if (!user || user.sub !== params.id) {
        set.status = 403;
        return { error: "Нельзя редактировать чужой профиль" };
      }
      const allowedFields: Record<string, unknown> = {};
      if (body.username !== undefined) allowedFields.username = body.username;
      if (body.email !== undefined) allowedFields.email = body.email;
      if (body.avatar !== undefined) allowedFields.avatar = body.avatar;
      if (body.color !== undefined) allowedFields.color = body.color;
      if (body.steam !== undefined) allowedFields.steam = body.steam;
      if (body.hangman !== undefined) allowedFields.hangman = body.hangman;
      if (Object.keys(allowedFields).length === 0) {
        set.status = 400;
        return { error: "Нет полей для обновления" };
      }
      await db
        .update(schema.users)
        .set({ ...allowedFields, updated: nowIso() })
        .where(eq(schema.users.id, params.id));
      broadcast("users", "update", params.id);
      const updatedUser = await userService.getById(params.id);
      logger
        .setAuthor(String(user?.username))
        .info(`updated profile ${updatedUser?.username ?? params.id}`);
      return updatedUser;
    },
    {
      body: t.Object({
        username: t.Optional(t.String()),
        email: t.Optional(t.String()),
        avatar: t.Optional(t.String()),
        color: t.Optional(t.String()),
        steam: t.Optional(t.String()),
        hangman: t.Optional(t.Boolean())
      }),
      requireAuth: true,
    },
)
.post(
    "/:id/restart",
    async ({ params, db }) => {
      const inventory = await db
        .select()
        .from(schema.inventory)
        .where(eq(schema.inventory.owner, params.id));
      const toRemove = inventory
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.floor(inventory.length / 2));
      for (const item of toRemove) {
        await db.delete(schema.inventory).where(eq(schema.inventory.id, item.id));
      }
      return { ok: true };
    },
    {
      requireAuth: true,
    },
  )
  .post(
    "/:id/position",
    async ({ params, body, db, user, set }) => {
      if (!user || user.sub !== params.id) {
        set.status = 403;
        return { error: "Нельзя редактировать чужую позицию" };
      }
      await db
        .update(schema.users)
        .set({ position: body.position, updated: nowIso() })
        .where(eq(schema.users.id, params.id));
      broadcast("users", "update", params.id);
      return { ok: true };
    },
    {
      body: t.Object({ position: t.Number() }),
      requireAuth: true,
    },
  )
  .post(
    "/:id/move",
    async ({ params, body, db, user, set }) => {
      if (!user || user.sub !== params.id) {
        set.status = 403;
        return { error: "Нельзя двигать чужого персонажа" };
      }

      const currentUser = await db
        .select({ position: schema.users.position })
        .from(schema.users)
        .where(eq(schema.users.id, params.id))
        .get();

      if (!currentUser) {
        set.status = 404;
        return { error: "User not found" };
      }

      const fromPosition = currentUser.position;
      const allCells = await db
        .select({
          number: schema.cells.number,
          ladderTo: schema.cells.ladderTo,
          snakeTo: schema.cells.snakeTo,
        })
        .from(schema.cells);

      const { path, finalPosition } = calculateMovePath(
        fromPosition,
        body.diceRoll,
        allCells as CellPath[],
      );

      await db
        .update(schema.users)
        .set({ position: finalPosition, updated: nowIso() })
        .where(eq(schema.users.id, params.id));

      broadcast("users", "update", params.id);

      return { path, finalPosition };
    },
    {
      body: t.Object({ diceRoll: t.Number() }),
      requireAuth: true,
    },
  )
  .post(
    "/:id/action",
    async ({ params, body, db, user, set }) => {
      if (!user || user.sub !== params.id) {
        set.status = 403;
        return { error: "Нельзя редактировать чужое действие" };
      }
      await db
        .update(schema.users)
        .set({ currentAction: body.action, updated: nowIso() })
        .where(eq(schema.users.id, params.id));
      broadcast("users", "update", params.id);
      return { ok: true };
    },
    {
      body: t.Object({
        action: t.Union([
          t.Literal("MOVE_POSITIVE"),
          t.Literal("MOVE_NEGATIVE"),
          t.Literal("GAMEADD"),
          t.Literal("GAMEFINISH"),
        ]),
      }),
      requireAuth: true,
    },
  )
  .post(
    "/:id/status",
    async ({ params, body, user, userService, set }) => {
      if (!user || user.sub !== params.id) {
        set.status = 403;
        return { error: "Нельзя редактировать чужой статус" };
      }
      const result = await userService.changeStatus(
        params.id,
        body.status,
        body.type,
      );
      logger
        .setAuthor(String(user?.username))
        .info(
          `changed status ${result?.username ?? params.id} ${body.type}:${body.status}`,
        );
      return result;
    },
    {
      body: t.Object({
        status: t.String(),
        type: t.Union([t.Literal("add"), t.Literal("remove")]),
      }),
      requireAuth: true,
    },
  )

  .post(
    "/:id/score",
    async ({ params, body, user, userService, set }) => {
      if (!user || user.sub !== params.id) {
        set.status = 403;
        return { error: "Нельзя редактировать чужой счёт" };
      }
      const result = await userService.score(params.id, body.score, body.trade);
      logger
        .setAuthor(String(user?.username))
        .info(
          `changed score ${result?.username ?? params.id} ${body.score > 0 ? `+${body.score}` : String(body.score)}`,
        );
      return result;
    },
    {
      body: t.Object({
        score: t.Number(),
        trade: t.Optional(t.Boolean()),
      }),
      requireAuth: true,
    },
  )
  .post(
    "/:id/dice",
    async ({ params, body, user, userService, set }) => {
      if (!user || user.sub !== params.id) {
        set.status = 403;
        return { error: "Нельзя редактировать чужие кости" };
      }
      const result = await userService.changeDice(
        params.id,
        body.realTime,
        body.action,
      );
      logger
        .setAuthor(String(user?.username))
        .info(
          `changed dice ${result?.username ?? params.id} ${body.action}`,
        );
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
      requireAuth: true,
    },
  )
  .post(
    "/:id/place",
    async ({ params, user, userService, set }) => {
      if (!user || user.sub !== params.id) {
        set.status = 403;
        return { error: "Нельзя редактировать чужое место" };
      }
      const result = await userService.updatePlace(params.id);
      logger
        .setAuthor(String(user?.username))
        .info(`assigned place ${result?.username ?? params.id}`);
      return result;
    },
    {
      requireAuth: true,
    },
  )
  .delete(
    "/:id/place",
    async ({ params, db, user, userService, set }) => {
      if (!user || user.sub !== params.id) {
        set.status = 403;
        return { error: "Нельзя редактировать чужое место" };
      }
      const [targetUser] = await db
        .select({ username: schema.users.username })
        .from(schema.users)
        .where(eq(schema.users.id, params.id));
      await db
        .update(schema.users)
        .set({ place: "0", updated: nowIso() })
        .where(eq(schema.users.id, params.id));
      broadcast("users", "update", params.id);
      logger
        .setAuthor(String(user?.username))
        .info(`cleared place ${targetUser?.username ?? params.id}`);
      return userService.getById(params.id);
    },
    {
      requireAuth: true,
    },
  );

export default usersRoute;
