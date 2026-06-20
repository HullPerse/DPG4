import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema.db";
import authPlugin, { signToken } from "@/plugins/auth.plugin";
import {
  newId,
  nowIso,
  omitPassword,
  withRecordMeta,
  USER_ACTIONS,
  ACTIVITY_TYPES,
} from "@/lib/index.utils";
import { broadcast } from "@/lib/websocket.utils";
import Logger from "@/lib/logger.utils";
import servicesPlugin from "@/services.server";
import databasePlugin from "@/plugins/database.plugin";
import { DbTimestamps } from "@/types/server";

const logger = new Logger("AUTH");

const authRoute = new Elysia({ prefix: "/auth" })
  .use(databasePlugin)
  .use(servicesPlugin)
  .use(authPlugin)
  .post(
    "/register",
    async ({ body, db, jwt, set, activityService }) => {
      const username = body.username.toUpperCase();
      const existing = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.username, username));
      if (existing.length > 0) {
        set.status = 400;
        return { error: "Username already exists" };
      }

      const id = newId();
      const ts = nowIso();
      const passwordHash = await Bun.password.hash(body.password);

      await db.insert(schema.users).values({
        id,
        username,
        passwordHash,
        email: `${username.toLowerCase()}@gmail.com`,
        avatar: body.avatar ?? "",
        color: body.color ?? "#000000",
        isAdmin: false,
        position: 0,
        money: 0,
        steam: "",
        currentAction: USER_ACTIONS.MOVE_POSITIVE,
        currentDice: 1,
        status: [],
        place: "0",
        created: ts,
        updated: ts,
      });

      await activityService.create({
        author: id,
        image: body.avatar ?? "",
        type: ACTIVITY_TYPES.EMOJI,
        text: `${username} создал аккаунт`,
      });

      broadcast("users", "create", id);

      const token = await signToken(jwt, id, false);
      const inserted = {
        id,
        username,
        passwordHash,
        email: `${username.toLowerCase()}@gmail.com`,
        avatar: body.avatar ?? "",
        color: body.color ?? "#000000",
        isAdmin: false,
        position: 0,
        money: 0,
        steam: "",
        currentAction: USER_ACTIONS.MOVE_POSITIVE,
        currentDice: 1,
        status: [],
        place: "0",
        gamblingWinnings: 0,
        gamblingBanned: false,
        created: ts,
        updated: ts,
      };
      const user = withRecordMeta(omitPassword(inserted), "users");

      logger.setAuthor(username).info("registered");
      return { token, user };
    },
    {
      body: t.Object({
        username: t.String(),
        password: t.String(),
        avatar: t.Optional(t.String()),
        color: t.Optional(t.String()),
      }),
    },
  )
  .post(
    "/login",
    async ({ body, db, jwt, set }) => {
      const username = body.username.toUpperCase();
      const [row] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.username, username));

      if (!row) {
        set.status = 401;
        return { error: "Invalid credentials" };
      }

      const valid = await Bun.password.verify(body.password, row.passwordHash);
      if (!valid) {
        set.status = 401;
        return { error: "Invalid credentials" };
      }

      const token = await signToken(jwt, row.id, row.isAdmin);
      const user = withRecordMeta(omitPassword(row) as DbTimestamps, "users");
      logger.setAuthor(row.username).info("logged in");
      return { token, user };
    },
    {
      body: t.Object({
        username: t.String(),
        password: t.String(),
      }),
    },
  )
  .get("/me", async ({ user, db, set }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const [row] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, user.sub));

    if (!row) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    return withRecordMeta(omitPassword(row) as DbTimestamps, "users");
  })
  .post("/refresh", async ({ user, db, jwt, set }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const [row] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, user.sub));

    if (!row) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const token = await signToken(jwt, row.id, row.isAdmin);
    logger.setAuthor(String(user.username)).info("refreshed session");
    return {
      token,
      user: withRecordMeta(omitPassword(row) as DbTimestamps, "users"),
    };
  });

export default authRoute;
