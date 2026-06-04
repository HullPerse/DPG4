import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema";
import {
  calculateCost,
  calculateScore,
  weightedRandom,
} from "../lib/game.utils";
import { GAMBLING_MIN_BET, GAMBLING_MAX_BET, GAMBLING_BID_OPTIONS, REROLL_PRICE, SPIN_COST, GAMBLING_BAN_THRESHOLD } from "../lib/gambling.constants";
import { calculateMovePath } from "../lib/cell.utils";
import { dbPlugin } from "../plugins/db.plugin";
import { servicesPlugin } from "../services/services.plugin";
import { nowIso } from "../lib/dates";

import { authPlugin } from "../plugins/auth.plugin";

export const gameUtilsRoute = new Elysia({ prefix: "/utils" })
  .use(dbPlugin)
  .use(servicesPlugin)
  .use(authPlugin)
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
  .get("/gambling-config", () => ({
    banThreshold: GAMBLING_BAN_THRESHOLD,
    minBet: GAMBLING_MIN_BET,
    maxBet: GAMBLING_MAX_BET,
    bidOptions: GAMBLING_BID_OPTIONS,
    rerollPrice: REROLL_PRICE,
    spinCost: SPIN_COST,
  }), {
    detail: { tags: ["utils"], summary: "Server gambling config" },
  })
  .post(
    "/dice-roll",
    async ({ body, set, diceService, user }) => {
      try {
        const uid = user!.sub;
        if (body.bid !== undefined) {
          return await diceService.rollDealer(uid, body.bid);
        }
        if (diceService.getActiveGame(uid)?.phase === "dealer") {
          return await diceService.rerollDealer(uid);
        }
        return await diceService.rollPlayer(uid);
      } catch (err) {
        set.status = 400;
        return { error: (err as Error).message };
      }
    },
    {
      requireAuth: true,
      body: t.Object({
        bid: t.Optional(t.Integer({ minimum: GAMBLING_MIN_BET, maximum: GAMBLING_MAX_BET })),
      }),
      detail: {
        tags: ["utils"],
        summary:
          "Two-phase Chinchirorin dice roll - phase 1 (with bid) rolls dealer, phase 2 (no bid) rolls player and settles",
      },
    },
  )
  .post(
    "/dice-abort",
    async ({ diceService, user }) => {
      await diceService.abort(user!.sub);
      return { success: true };
    },
    {
      requireAuth: true,
      detail: { tags: ["utils"], summary: "Abort active dice game" },
    },
  )
  .post(
    "/blackjack-deal",
    async ({ body, set, blackjackService, user }) => {
      try {
        return await blackjackService.deal(user!.sub, body.bid);
      } catch (err) {
        set.status = 400;
        return { error: (err as Error).message };
      }
    },
    {
      requireAuth: true,
      body: t.Object({
        bid: t.Integer({ minimum: GAMBLING_MIN_BET, maximum: GAMBLING_MAX_BET }),
      }),
      detail: {
        tags: ["utils"],
        summary: "Deal blackjack hand",
      },
    },
  )
  .post(
    "/blackjack-hit",
    async ({ set, blackjackService, user }) => {
      try {
        return await blackjackService.hit(user!.sub);
      } catch (err) {
        set.status = 400;
        return { error: (err as Error).message };
      }
    },
    {
      requireAuth: true,
      detail: { tags: ["utils"], summary: "Hit in blackjack" },
    },
  )
  .post(
    "/blackjack-stand",
    async ({ set, blackjackService, user }) => {
      try {
        return await blackjackService.stand(user!.sub);
      } catch (err) {
        set.status = 400;
        return { error: (err as Error).message };
      }
    },
    {
      requireAuth: true,
      detail: { tags: ["utils"], summary: "Stand in blackjack" },
    },
  )
  .post(
    "/blackjack-sync",
    async ({ blackjackService, user }) => {
      const state = await blackjackService.getState(user!.sub);
      return { state };
    },
    {
      requireAuth: true,
      detail: {
        tags: ["utils"],
        summary: "Get in-progress blackjack hand for client restore",
      },
    },
  )
  .post(
    "/blackjack-abandon",
    async ({ blackjackService, user }) => {
      blackjackService.abandon(user!.sub);
      return { success: true };
    },
    {
      requireAuth: true,
      detail: {
        tags: ["utils"],
        summary: "Clear stuck blackjack session (forfeit hand)",
      },
    },
  )
  .post(
    "/dice-unban",
    async ({ db, set, user }) => {
      try {
        await db
          .update(schema.users)
          .set({
            gamblingWinnings: 0,
            gamblingBanned: false,
            updated: nowIso(),
          })
          .where(eq(schema.users.id, user!.sub));
        return { success: true };
      } catch (err) {
        set.status = 400;
        return { error: (err as Error).message };
      }
    },
    {
      requireAuth: true,
      detail: {
        tags: ["utils"],
        summary: "Reset gambling ban for the authenticated user",
      },
    },
  )
  .post(
    "/rocket-launch",
    async ({ body, set, rocketService, user }) => {
      try {
        return await rocketService.launch(user!.sub, body.bid);
      } catch (err) {
        set.status = 400;
        return { error: (err as Error).message };
      }
    },
    {
      requireAuth: true,
      body: t.Object({
        bid: t.Integer({ minimum: GAMBLING_MIN_BET, maximum: GAMBLING_MAX_BET }),
      }),
      detail: {
        tags: ["utils"],
        summary: "Launch a rocket round - generates crash point",
      },
    },
  )
  .post(
    "/rocket-cashout",
    async ({ set, rocketService, user }) => {
      try {
        return await rocketService.cashout(user!.sub);
      } catch (err) {
        set.status = 400;
        return { error: (err as Error).message };
      }
    },
    {
      requireAuth: true,
      detail: {
        tags: ["utils"],
        summary: "Cash out rocket - collect winnings at current multiplier",
      },
    },
  )
  .post(
    "/rocket-poll",
    async ({ set, rocketService, user }) => {
      try {
        return await rocketService.poll(user!.sub);
      } catch (err) {
        set.status = 400;
        return { error: (err as Error).message };
      }
    },
    {
      requireAuth: true,
      detail: {
        tags: ["utils"],
        summary: "Poll current rocket state (multiplier, crash detection)",
      },
    },
  )
  .post(
    "/rocket-abandon",
    async ({ rocketService, user }) => {
      rocketService.abandon(user!.sub);
      return { success: true };
    },
    {
      requireAuth: true,
      detail: {
        tags: ["utils"],
        summary: "Abandon active rocket game",
      },
    },
  )
  .post(
    "/rocket-dismiss",
    async ({ rocketService, user }) => {
      rocketService.dismiss(user!.sub);
      return { success: true };
    },
    {
      requireAuth: true,
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
    async ({ body, set, pachinkoService, user }) => {
      try {
        return await pachinkoService.drop(user!.sub, body.bid);
      } catch (err) {
        set.status = 400;
        return { error: (err as Error).message };
      }
    },
    {
      requireAuth: true,
      body: t.Object({
        bid: t.Integer({ minimum: GAMBLING_MIN_BET, maximum: GAMBLING_MAX_BET }),
      }),
      detail: {
        tags: ["utils"],
        summary: "Drop pachinko ball - deducts bid",
      },
    },
  )
  .post(
    "/pachinko-settle",
    async ({ body, set, pachinkoService, user }) => {
      try {
        return await pachinkoService.settle(user!.sub, body.slotIndex);
      } catch (err) {
        set.status = 400;
        return { error: (err as Error).message };
      }
    },
    {
      requireAuth: true,
      body: t.Object({
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
    async ({ set, pachinkoService, user }) => {
      try {
        return await pachinkoService.sync(user!.sub);
      } catch (err) {
        set.status = 400;
        return { error: (err as Error).message };
      }
    },
    {
      requireAuth: true,
      detail: {
        tags: ["utils"],
        summary: "Sync active pachinko drop state",
      },
    },
  )
  .post(
    "/pachinko-abandon",
    async ({ pachinkoService, user }) => {
      pachinkoService.abandon(user!.sub);
      return { success: true };
    },
    {
      requireAuth: true,
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
