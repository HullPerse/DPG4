import { Elysia, t } from "elysia";
import { calculateCost, calculateScore } from "../lib/game.utils";

export const gameUtilsRoute = new Elysia({ prefix: "/utils" })
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
  );
