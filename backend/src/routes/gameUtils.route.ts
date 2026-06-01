import { Elysia, t } from "elysia";
import { calculateCost, calculateScore } from "../lib/game.utils";
import { dbPlugin } from "../plugins/db.plugin";
import { rollDice } from "../services/dice.service";

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
        return await rollDice(db, body.userId);
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
        summary: "Server-authoritative dice roll — generates values, calculates payout, updates balance",
      },
    },
  );
