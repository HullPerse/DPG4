import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema";
import { calculateCost, calculateScore } from "../lib/game.utils";
import { dbPlugin } from "../plugins/db.plugin";
import { rollDice } from "../services/dice.service";
import {
  blackjackDeal,
  blackjackHit,
  blackjackStand,
  getBlackjackState,
  abandonBlackjack,
} from "../services/blackjack.service";
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
    "/blackjack-deal",
    async ({ body, db, set }) => {
      try {
        return await blackjackDeal(db, body.userId, body.bid);
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
        summary: "Deal blackjack hand",
      },
    },
  )
  .post(
    "/blackjack-hit",
    async ({ body, db, set }) => {
      try {
        return await blackjackHit(db, body.userId);
      } catch (err) {
        set.status = 400;
        return { error: (err as Error).message };
      }
    },
    {
      body: t.Object({ userId: t.String() }),
      detail: { tags: ["utils"], summary: "Hit in blackjack" },
    },
  )
  .post(
    "/blackjack-stand",
    async ({ body, db, set }) => {
      try {
        return await blackjackStand(db, body.userId);
      } catch (err) {
        set.status = 400;
        return { error: (err as Error).message };
      }
    },
    {
      body: t.Object({ userId: t.String() }),
      detail: { tags: ["utils"], summary: "Stand in blackjack" },
    },
  )
  .post(
    "/blackjack-sync",
    async ({ body, db }) => {
      const state = await getBlackjackState(db, body.userId);
      return { state };
    },
    {
      body: t.Object({ userId: t.String() }),
      detail: {
        tags: ["utils"],
        summary: "Get in-progress blackjack hand for client restore",
      },
    },
  )
  .post(
    "/blackjack-abandon",
    async ({ body }) => {
      abandonBlackjack(body.userId);
      return { success: true };
    },
    {
      body: t.Object({ userId: t.String() }),
      detail: {
        tags: ["utils"],
        summary: "Clear stuck blackjack session (forfeit hand)",
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
