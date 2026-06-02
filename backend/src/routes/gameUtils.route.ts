import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema";
import {
  calculateCost,
  calculateScore,
  weightedRandom,
} from "../lib/game.utils";
import { calculateMovePath } from "../lib/cell.utils";
import { dbPlugin } from "../plugins/db.plugin";
import { servicesPlugin } from "../services/services.plugin";
import { nowIso } from "../lib/dates";

export const gameUtilsRoute = new Elysia({ prefix: "/utils" })
  .use(dbPlugin)
  .use(servicesPlugin)
  .get(
    "/calculate-score",
    ({ query }) => ({
      score: calculateScore(Number(query.realTime), Number(query.hltbTime)),
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
  .get("/calculate-cost", () => ({ cost: calculateCost() }), {
    detail: { tags: ["utils"], summary: "Wheel spin cost" },
  })
  .post(
    "/dice-roll",
    async ({ body, set, diceService }) => {
      try {
        return await diceService.roll(body.userId, body.bid);
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
        summary:
          "Server-authoritative dice roll - generates values, calculates payout, updates balance",
      },
    },
  )
  .post(
    "/blackjack-deal",
    async ({ body, set, blackjackService }) => {
      try {
        return await blackjackService.deal(body.userId, body.bid);
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
    async ({ body, set, blackjackService }) => {
      try {
        return await blackjackService.hit(body.userId);
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
    async ({ body, set, blackjackService }) => {
      try {
        return await blackjackService.stand(body.userId);
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
    async ({ body, blackjackService }) => {
      const state = await blackjackService.getState(body.userId);
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
    async ({ body, blackjackService }) => {
      blackjackService.abandon(body.userId);
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
  )
  .post(
    "/rocket-launch",
    async ({ body, set, rocketService }) => {
      try {
        return await rocketService.launch(body.userId, body.bid);
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
        summary: "Launch a rocket round - generates crash point",
      },
    },
  )
  .post(
    "/rocket-cashout",
    async ({ body, set, rocketService }) => {
      try {
        return await rocketService.cashout(body.userId);
      } catch (err) {
        set.status = 400;
        return { error: (err as Error).message };
      }
    },
    {
      body: t.Object({ userId: t.String() }),
      detail: {
        tags: ["utils"],
        summary: "Cash out rocket - collect winnings at current multiplier",
      },
    },
  )
  .post(
    "/rocket-poll",
    async ({ body, set, rocketService }) => {
      try {
        return await rocketService.poll(body.userId);
      } catch (err) {
        set.status = 400;
        return { error: (err as Error).message };
      }
    },
    {
      body: t.Object({ userId: t.String() }),
      detail: {
        tags: ["utils"],
        summary: "Poll current rocket state (multiplier, crash detection)",
      },
    },
  )
  .post(
    "/rocket-abandon",
    async ({ body, rocketService }) => {
      rocketService.abandon(body.userId);
      return { success: true };
    },
    {
      body: t.Object({ userId: t.String() }),
      detail: {
        tags: ["utils"],
        summary: "Abandon active rocket game",
      },
    },
  )
  .post(
    "/rocket-dismiss",
    async ({ body, rocketService }) => {
      rocketService.dismiss(body.userId);
      return { success: true };
    },
    {
      body: t.Object({ userId: t.String() }),
      detail: {
        tags: ["utils"],
        summary: "Dismiss rocket result screen after crash or cashout",
      },
    },
  )
  .get(
    "/rocket-history",
    async ({ rocketService }) => {
      return rocketService.getHistory();
    },
    {
      detail: {
        tags: ["utils"],
        summary: "Get recent rocket crash history",
      },
    },
  )
  .post(
    "/pachinko-drop",
    async ({ body, set, pachinkoService }) => {
      try {
        return await pachinkoService.drop(body.userId, body.bid);
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
        summary: "Drop pachinko ball - deducts bid",
      },
    },
  )
  .post(
    "/pachinko-settle",
    async ({ body, set, pachinkoService }) => {
      try {
        return await pachinkoService.settle(body.userId, body.slotIndex);
      } catch (err) {
        set.status = 400;
        return { error: (err as Error).message };
      }
    },
    {
      body: t.Object({
        userId: t.String(),
        slotIndex: t.Integer({ minimum: 0, maximum: 12 }),
      }),
      detail: {
        tags: ["utils"],
        summary: "Settle pachinko drop - payout from slot index",
      },
    },
  )
  .post(
    "/pachinko-sync",
    async ({ body, set, pachinkoService }) => {
      try {
        return await pachinkoService.sync(body.userId);
      } catch (err) {
        set.status = 400;
        return { error: (err as Error).message };
      }
    },
    {
      body: t.Object({ userId: t.String() }),
      detail: {
        tags: ["utils"],
        summary: "Sync active pachinko drop state",
      },
    },
  )
  .post(
    "/pachinko-abandon",
    async ({ body, pachinkoService }) => {
      pachinkoService.abandon(body.userId);
      return { success: true };
    },
    {
      body: t.Object({ userId: t.String() }),
      detail: {
        tags: ["utils"],
        summary: "Abandon active pachinko drop",
      },
    },
  )
  .post(
    "/weighted-random",
    ({ body }) => ({
      result: weightedRandom(body.max),
    }),
    {
      body: t.Object({
        max: t.Integer({ minimum: 1 }),
      }),
      detail: {
        tags: ["utils"],
        summary: "Server-authoritative weighted random number",
      },
    },
  )
  .post(
    "/calculate-move-path",
    async ({ body, db }) => {
      const { startingPosition, diceRoll } = body;
      const allCells = await db
        .select({
          number: schema.cells.number,
          ladderTo: schema.cells.ladderTo,
          snakeTo: schema.cells.snakeTo,
        })
        .from(schema.cells);
      const result = calculateMovePath(startingPosition, diceRoll, allCells);
      return result;
    },
    {
      body: t.Object({
        startingPosition: t.Number(),
        diceRoll: t.Number(),
      }),
      detail: {
        tags: ["utils"],
        summary:
          "Server-authoritative board movement path with snake/ladder resolution",
      },
    },
  );
