import { Elysia, t } from "elysia";
import { eq, sql, and } from "drizzle-orm";
import * as schema from "@/db/schema.db";
import { newId, nowIso, getUser } from "@/lib/index.utils";
import { broadcast } from "@/lib/websocket.utils";
import Logger from "@/lib/logger.utils";
import { databasePlugin } from "@/plugins/index.plugin";

const logger = new Logger("HANGMAN");

export default new Elysia({ prefix: "/hangman" })
  .use(databasePlugin)

  .get(
    "/:userId",
    async ({ params, db }) => {
      const record = await db
        .select()
        .from(schema.hangman)
        .where(eq(schema.hangman.userId, params.userId))
        .orderBy(sql`${schema.hangman.created} DESC`)
        .get();

      if (record && (record.state === "won" || record.state === "lost")) return null;

      return record ?? null;
    },
    {
      params: t.Object({ userId: t.String() }),
    },
  )

  .get(
    "/:userId/streak",
    async ({ params, db }) => {
      const rows = await db
        .select()
        .from(schema.hangman)
        .where(eq(schema.hangman.userId, params.userId))
        .orderBy(sql`${schema.hangman.created} DESC`);
      let streak = 0;
      for (const row of rows) {
        if (row.state === "won") streak++;
        else break;
      }
      return { streak };
    },
    {
      params: t.Object({ userId: t.String() }),
    },
  )

  .post(
    "/:userId",
    async ({ params, db }) => {
      const latest = await db
        .select()
        .from(schema.hangman)
        .where(eq(schema.hangman.userId, params.userId))
        .orderBy(sql`${schema.hangman.created} DESC`)
        .get();

      if (latest) {
        if (latest.state === "won" || latest.state === "lost") {
          // game finished, start a new one below
        } else {
          return latest;
        }
      }

      const [randomItem] = await db
        .select({ label: schema.items.label })
        .from(schema.items)
        .orderBy(sql`RANDOM()`)
        .limit(1);

      const word = randomItem?.label ?? "ПРЕДМЕТ";
      const now = nowIso();
      const id = newId();

      await db.insert(schema.hangman).values({
        id,
        userId: params.userId,
        word,
        state: "current",
        created: now,
        updated: now,
      });

      return await db
        .select()
        .from(schema.hangman)
        .where(eq(schema.hangman.id, id))
        .get();
    },
    {
      params: t.Object({ userId: t.String() }),
    },
  )

  .patch(
    "/:userId/state",
    async ({ params, body, db }) => {
      const now = nowIso();
      const record = await db
        .select()
        .from(schema.hangman)
        .where(
          and(
            eq(schema.hangman.userId, params.userId),
            eq(schema.hangman.state, "current"),
          ),
        )
        .get();
      // ponytail: no active game, nothing to save — skip silently
      if (!record) return null;

      await db
        .update(schema.hangman)
        .set({
          guessedLetters: body.guessedLetters,
          wrongLetters: body.wrongLetters,
          updated: now,
        })
        .where(eq(schema.hangman.id, record.id));

      return await db
        .select()
        .from(schema.hangman)
        .where(eq(schema.hangman.id, record.id))
        .get();
    },
    {
      params: t.Object({ userId: t.String() }),
      body: t.Object({
        guessedLetters: t.Array(t.String()),
        wrongLetters: t.Array(t.String()),
      }),
    },
  )

  .post(
    "/:userId/play",
    async ({ params, body, db }) => {
      const now = nowIso();
      const record = await db
        .select()
        .from(schema.hangman)
        .where(
          and(
            eq(schema.hangman.userId, params.userId),
            eq(schema.hangman.state, "current"),
          ),
        )
        .get();

      if (!record) throw new Error("No active hangman round");

      await db
        .update(schema.hangman)
        .set({
          state: body.won ? "won" : "lost",
          guessedLetters: body.guessedLetters,
          wrongLetters: body.wrongLetters,
          updated: now,
        })
        .where(eq(schema.hangman.id, record.id));

      broadcast("hangman", "update", params.userId);
      const hUser = await getUser(db, params.userId);
      logger
        .setAuthor(hUser?.username ?? "SYSTEM")
        .info(`user played ${body.won}`);

      return await db
        .select()
        .from(schema.hangman)
        .where(eq(schema.hangman.id, record.id))
        .get();
    },
    {
      params: t.Object({ userId: t.String() }),
      body: t.Object({
        won: t.Boolean(),
        guessedLetters: t.Array(t.String()),
        wrongLetters: t.Array(t.String()),
      }),
    },
  );
