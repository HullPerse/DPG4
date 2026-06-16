import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema";
import {
  calculateCost,
  calculateScore,
  weightedRandom,
} from "../lib/game.utils";
import {
  GAMBLING_MIN_BET,
  GAMBLING_MAX_BET,
  GAMBLING_BID_OPTIONS,
  REROLL_PRICE,
  SPIN_COST,
  GAMBLING_BAN_THRESHOLD,
} from "../lib/gambling.constants";
import { calculateMovePath } from "../lib/cell.utils";
import { dbPlugin } from "../plugins/db.plugin";
import { servicesPlugin } from "../services.server";
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
  .get(
    "/gambling-config",
    () => ({
      banThreshold: GAMBLING_BAN_THRESHOLD,
      minBet: GAMBLING_MIN_BET,
      maxBet: GAMBLING_MAX_BET,
      bidOptions: GAMBLING_BID_OPTIONS,
      rerollPrice: REROLL_PRICE,
      spinCost: SPIN_COST,
    }),
    {
      detail: { tags: ["utils"], summary: "Server gambling config" },
    },
  )
  .post(
    "/dice-roll",
    async ({ body, set, headers, diceService, user }) => {
      try {
        const uid = user!.sub;
        const devMode = headers["x-dev-mode"] === "1" || (body as any).devMode;
        const devOverrides = body as any;
        if (body.bid !== undefined) {
          return await diceService.rollDealer(uid, body.bid, devMode, devOverrides);
        }
        if (diceService.getActiveGame(uid)?.phase === "dealer") {
          return await diceService.rerollDealer(uid, devMode, devOverrides);
        }
        return await diceService.rollPlayer(uid, devMode, devOverrides);
      } catch (err) {
        set.status = 400;
        return { error: (err as Error).message };
      }
    },
    {
      requireAuth: true,
      body: t.Object({
        bid: t.Optional(
          t.Integer({ minimum: GAMBLING_MIN_BET, maximum: GAMBLING_MAX_BET }),
        ),
      }, { additionalProperties: true }),
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
      return await diceService.abort(user!.sub);
    },
    {
      requireAuth: true,
      body: t.Object({}),
      detail: { tags: ["utils"], summary: "Abort active dice game" },
    },
  )
  .post(
    "/blackjack-deal",
    async ({ body, set, headers, blackjackService, user }) => {
      try {
        const devMode = headers["x-dev-mode"] === "1" || (body as any).devMode;
        return await blackjackService.deal(user!.sub, body.bid, devMode, body as any);
      } catch (err) {
        set.status = 400;
        return { error: (err as Error).message };
      }
    },
    {
      requireAuth: true,
      body: t.Object({
        bid: t.Integer({
          minimum: GAMBLING_MIN_BET,
          maximum: GAMBLING_MAX_BET,
        }),
      }, { additionalProperties: true }),
      detail: {
        tags: ["utils"],
        summary: "Deal blackjack hand",
      },
    },
  )
  .post(
    "/blackjack-hit",
    async ({ body, set, headers, blackjackService, user }) => {
      try {
        const devMode = headers["x-dev-mode"] === "1" || (body as any).devMode;
        return await blackjackService.hit(user!.sub, devMode, body as any);
      } catch (err) {
        set.status = 400;
        return { error: (err as Error).message };
      }
    },
    {
      requireAuth: true,
      body: t.Object({}, { additionalProperties: true }),
      detail: { tags: ["utils"], summary: "Hit in blackjack" },
    },
  )
  .post(
    "/blackjack-stand",
    async ({ body, set, headers, blackjackService, user }) => {
      try {
        const devMode = headers["x-dev-mode"] === "1" || (body as any).devMode;
        return await blackjackService.stand(user!.sub, devMode);
      } catch (err) {
        set.status = 400;
        return { error: (err as Error).message };
      }
    },
    {
      requireAuth: true,
      body: t.Object({}, { additionalProperties: true }),
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
      body: t.Object({}),
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
      body: t.Object({}),
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
      body: t.Object({}),
      detail: {
        tags: ["utils"],
        summary: "Reset gambling ban for the authenticated user",
      },
    },
  )
  .post(
    "/rocket-launch",
    async ({ body, set, headers, rocketService, user }) => {
      try {
        const devMode = headers["x-dev-mode"] === "1" || (body as any).devMode;
        return await rocketService.launch(user!.sub, body.bid, devMode, body as any);
      } catch (err) {
        set.status = 400;
        return { error: (err as Error).message };
      }
    },
    {
      requireAuth: true,
      body: t.Object({
        bid: t.Integer({
          minimum: GAMBLING_MIN_BET,
          maximum: GAMBLING_MAX_BET,
        }),
      }, { additionalProperties: true }),
      detail: {
        tags: ["utils"],
        summary: "Launch a rocket round - generates crash point",
      },
    },
  )
  .post(
    "/rocket-cashout",
    async ({ body, set, headers, rocketService, user }) => {
      try {
        const devMode = headers["x-dev-mode"] === "1" || (body as any).devMode;
        return await rocketService.cashout(user!.sub, devMode);
      } catch (err) {
        set.status = 400;
        return { error: (err as Error).message };
      }
    },
    {
      requireAuth: true,
      body: t.Object({}, { additionalProperties: true }),
      detail: {
        tags: ["utils"],
        summary: "Cash out rocket - collect winnings at current multiplier",
      },
    },
  )
  .post(
    "/rocket-poll",
    async ({ body, set, headers, rocketService, user }) => {
      try {
        const devMode = headers["x-dev-mode"] === "1" || (body as any).devMode;
        return await rocketService.poll(user!.sub, devMode);
      } catch (err) {
        set.status = 400;
        return { error: (err as Error).message };
      }
    },
    {
      requireAuth: true,
      body: t.Object({}, { additionalProperties: true }),
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
      body: t.Object({}),
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
      body: t.Object({}),
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
    async ({ body, set, headers, pachinkoService, user }) => {
      try {
        const devMode = headers["x-dev-mode"] === "1" || (body as any).devMode;
        return await pachinkoService.drop(user!.sub, body.bid, body.ratAmount, devMode, body as any);
      } catch (err) {
        set.status = 400;
        return { error: (err as Error).message };
      }
    },
    {
      requireAuth: true,
      body: t.Object({
        bid: t.Integer({
          minimum: GAMBLING_MIN_BET,
          maximum: GAMBLING_MAX_BET,
        }),
        ratAmount: t.Integer({ minimum: 1, maximum: 5 }),
      }, { additionalProperties: true }),
      detail: {
        tags: ["utils"],
        summary: "Drop pachinko ball(s) - deducts bid * ratAmount",
      },
    },
  )
  .post(
    "/pachinko-settle",
    async ({ body, set, headers, pachinkoService, user }) => {
      try {
        const devMode = headers["x-dev-mode"] === "1" || (body as any).devMode;
        return await pachinkoService.settle(user!.sub, body.slotIndexes, devMode, body as any);
      } catch (err) {
        set.status = 400;
        return { error: (err as Error).message };
      }
    },
    {
      requireAuth: true,
      body: t.Object({
        slotIndexes: t.Array(t.Integer({ minimum: 0, maximum: 12 }), {
          minItems: 1,
          maxItems: 5,
        }),
      }, { additionalProperties: true }),
      detail: {
        tags: ["utils"],
        summary: "Settle pachinko drop - payout from slot indexes (one per rat)",
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
      body: t.Object({}),
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
      body: t.Object({}),
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
    "/mines-start",
    async ({ body, set, headers, minesService, user }) => {
      try {
        const devMode = headers["x-dev-mode"] === "1" || (body as any).devMode;
        return await minesService.start(user!.sub, body.bid, body.mineCount, devMode, body as any);
      } catch (err) {
        set.status = 400;
        return { error: (err as Error).message };
      }
    },
    {
      requireAuth: true,
      body: t.Object({
        bid: t.Integer({ minimum: GAMBLING_MIN_BET, maximum: GAMBLING_MAX_BET }),
        mineCount: t.Integer({ minimum: 1, maximum: 10 }),
      }, { additionalProperties: true }),
      detail: {
        tags: ["utils"],
        summary: "Start a mines game - deducts bid, reveals initial state",
      },
    },
  )
  .post(
    "/mines-reveal",
    async ({ body, set, headers, minesService, user }) => {
      try {
        const devMode = headers["x-dev-mode"] === "1" || (body as any).devMode;
        return await minesService.reveal(user!.sub, body.x, body.y, devMode, body as any);
      } catch (err) {
        set.status = 400;
        return { error: (err as Error).message };
      }
    },
    {
      requireAuth: true,
      body: t.Object({
        x: t.Integer({ minimum: 0, maximum: 4 }),
        y: t.Integer({ minimum: 0, maximum: 4 }),
      }, { additionalProperties: true }),
      detail: {
        tags: ["utils"],
        summary: "Reveal a tile in mines game",
      },
    },
  )
  .post(
    "/mines-cashout",
    async ({ body, set, headers, minesService, user }) => {
      try {
        const devMode = headers["x-dev-mode"] === "1" || (body as any).devMode;
        return await minesService.cashout(user!.sub, devMode);
      } catch (err) {
        set.status = 400;
        return { error: (err as Error).message };
      }
    },
    {
      requireAuth: true,
      body: t.Object({}, { additionalProperties: true }),
      detail: {
        tags: ["utils"],
        summary: "Cash out current mines winnings",
      },
    },
  )
  .post(
    "/mines-abort",
    async ({ minesService, user }) => {
      minesService.abort(user!.sub);
      return { success: true };
    },
    {
      requireAuth: true,
      body: t.Object({}),
      detail: {
        tags: ["utils"],
        summary: "Abort active mines game",
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
