import { Elysia, t } from "elysia";
import { eq, sql, desc, and } from "drizzle-orm";
import * as schema from "../db/schema";
import { newId } from "../lib/ids";
import { nowIso } from "../lib/dates";
import { broadcast } from "../lib/ws";
import { logger } from "../lib/logger";
import { dbPlugin } from "../plugins/db.plugin";

export const hangmanRoute = new Elysia({ prefix: "/hangman" })
  .use(dbPlugin)

  .get(
    "/:userId",
    async ({ params, db }) => {
      const record = await db
        .select()
        .from(schema.hangman)
        .where(eq(schema.hangman.userId, params.userId))
        .orderBy(desc(schema.hangman.created))
        .get();
      return record ?? null;
    },
    {
      params: t.Object({ userId: t.String() }),
      detail: { tags: ["hangman"], summary: "Get user's latest hangman record" },
    },
  )

  .get(
    "/:userId/streak",
    async ({ params, db }) => {
      const rows = await db
        .select()
        .from(schema.hangman)
        .where(eq(schema.hangman.userId, params.userId))
        .orderBy(desc(schema.hangman.created));
      let streak = 0;
      for (const row of rows) {
        if (row.state === "won") streak++;
        else break;
      }
      return { streak };
    },
    {
      params: t.Object({ userId: t.String() }),
      detail: { tags: ["hangman"], summary: "Get win streak" },
    },
  )

  .post(
    "/:userId",
    async ({ params, db }) => {
      const current = await db
        .select()
        .from(schema.hangman)
        .where(
          and(
            eq(schema.hangman.userId, params.userId),
            eq(schema.hangman.state, "current"),
          ),
        )
        .get();

      if (current) return current;

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
      detail: { tags: ["hangman"], summary: "Get latest or create first hangman record" },
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
      if (!record) throw new Error("No active hangman round");

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
      detail: { tags: ["hangman"], summary: "Save mid-game state" },
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
      logger.info("hangman", "user played", params.userId, body.won);

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
      detail: { tags: ["hangman"], summary: "Mark current round as played" },
    },
  );
