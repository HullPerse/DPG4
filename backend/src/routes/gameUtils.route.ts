import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema";
import { calculateCost, calculateScore } from "../lib/game.utils";
import { dbPlugin } from "../plugins/db.plugin";
import { rollDice } from "../services/dice.service";
import { nowIso } from "../lib/dates";

export const gameUtilsRoute = new Elysia({ prefix: "/utils" })
  .use(dbPlugin)
  .get(
    "/calculate-score",
    ({ query }) => ({
      score: calculateScore(
        Number(query.realTime),
        Number(query.hltbTime),
      ),
    }),
    {
      query: t.Object({
        realTime: t.String(),
        hltbTime: t.String(),
      }),
      detail: {
        tags: ["utils"],
        summary: "Calculate game completion score",
      },
    },
  )
  .get(
    "/calculate-cost",
    () => ({ cost: calculateCost() }),
    {
      detail: { tags: ["utils"], summary: "Wheel spin cost" },
    },
  )
  .post(
    "/dice-roll",
    async ({ body, db, set }) => {
      try {
        return await rollDice(db, body.userId, body.bid);
      } catch (err) {
        set.status = 400;
        return { error: (err as Error).message };
      }
    },
    {
      body: t.Object({
        userId: t.String(),
        bid: t.Integer({ minimum: 1, maximum: 10 }),
      }),
      detail: {
        tags: ["utils"],
        summary: "Server-authoritative dice roll — generates values, calculates payout, updates balance",
      },
    },
  )
  .post(
    "/dice-unban",
    async ({ body, db, set }) => {
      try {
        await db
          .update(schema.users)
          .set({
            gamblingWinnings: 0,
            gamblingBanned: false,
            updated: nowIso(),
          })
          .where(eq(schema.users.id, body.userId));
        return { success: true };
      } catch (err) {
        set.status = 400;
        return { error: (err as Error).message };
      }
    },
    {
      body: t.Object({
        userId: t.String(),
      }),
      detail: {
        tags: ["utils"],
        summary: "Reset gambling ban for a user",
      },
    },
  );
