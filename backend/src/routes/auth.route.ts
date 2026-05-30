import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema";
import { authPlugin, signToken } from "../plugins/auth.plugin";
import { newId } from "../lib/ids";
import { nowIso } from "../lib/dates";
import { omitPassword, withRecordMeta } from "../lib/record";
import { createActivity } from "../services/activity.service";
import { broadcast } from "../lib/ws";
import { dbPlugin } from "../plugins/db.plugin";

export const authRoute = new Elysia({ prefix: "/auth" })
  .use(dbPlugin)
  .use(authPlugin)
  .post(
    "/register",
    async ({ body, db, jwt, set }) => {
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
        currentAction: "MOVE_POSITIVE",
        currentDice: 1,
        status: [],
        place: "0",
        created: ts,
        updated: ts,
      });

      await createActivity(db, {
        author: id,
        image: body.avatar ?? "",
        type: "emoji",
        text: `${username} создал аккаунт`,
      });

      broadcast("users", "create", id);

      const token = await signToken(jwt, id, false);
      const user = withRecordMeta(
        omitPassword({
          id,
          username,
          email: `${username.toLowerCase()}@gmail.com`,
          avatar: body.avatar ?? "",
          color: body.color ?? "#000000",
          isAdmin: false,
          position: 0,
          money: 0,
          steam: "",
          currentAction: "MOVE_POSITIVE",
          currentDice: 1,
          status: [] as string[],
          place: "0",
          created: ts,
          updated: ts,
        }),
        "users",
      );

      return { token, user };
    },
    {
      body: t.Object({
        username: t.String(),
        password: t.String(),
        avatar: t.Optional(t.String()),
        color: t.Optional(t.String()),
      }),
      detail: { tags: ["auth"], summary: "Register new user" },
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
      const user = withRecordMeta(omitPassword(row), "users");
      return { token, user };
    },
    {
      body: t.Object({
        username: t.String(),
        password: t.String(),
      }),
      detail: { tags: ["auth"], summary: "Login" },
    },
  )
  .get(
    "/me",
    async ({ user, db, set }) => {
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
      return withRecordMeta(omitPassword(row), "users");
    },
    { detail: { tags: ["auth"], summary: "Current user" } },
  )
  .post(
    "/refresh",
    async ({ user, db, jwt, set }) => {
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
      return {
        token,
        user: withRecordMeta(omitPassword(row), "users"),
      };
    },
    { detail: { tags: ["auth"], summary: "Refresh session" } },
  );
