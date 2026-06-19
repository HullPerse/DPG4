import { Elysia, t } from "elysia"
import { eq } from "drizzle-orm"
import * as schema from "@/db/schema.db"
import {
  calculateCost,
  calculateScore,
  weightedRandom,
} from "@/lib/game.utils"
import {
  GAMBLING_MIN_BET,
  GAMBLING_MAX_BET,
  GAMBLING_BID_OPTIONS,
  REROLL_PRICE,
  SPIN_COST,
  GAMBLING_BAN_THRESHOLD,
} from "@/lib/gambling.constants"
import { calculateMovePath } from "@/lib/cell.utils"
import databasePlugin from "@/plugins/database.plugin"
import servicesPlugin from "@/services.server"
import { nowIso } from "@/lib/index.utils"
import authPlugin from "@/plugins/auth.plugin"

export default new Elysia({ prefix: "/utils" })
  .use(databasePlugin)
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
    },
  )
  .get("/calculate-cost", () => ({ cost: calculateCost() }))
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
  )
  .post(
    "/dice-roll",
    async ({ body, set, headers, diceService, user }) => {
      try {
        const uid = user!.sub
        const devMode = headers["x-dev-mode"] === "1" || (body as any).devMode
        const devOverrides = body as any
        if (body.bid !== undefined) {
          return await diceService.rollDealer(uid, body.bid, devMode, devOverrides)
        }
        if (diceService.getActiveGame(uid)?.phase === "dealer") {
          return await diceService.rerollDealer(uid, devMode, devOverrides)
        }
        return await diceService.rollPlayer(uid, devMode, devOverrides)
      } catch (err) {
        set.status = 400
        return { error: (err as Error).message }
      }
    },
    {
      requireAuth: true,
      body: t.Object({
        bid: t.Optional(
          t.Integer({ minimum: GAMBLING_MIN_BET, maximum: GAMBLING_MAX_BET }),
        ),
      }, { additionalProperties: true }),
    },
  )
  .post(
    "/dice-abort",
    async ({ diceService, user }) => {
      return await diceService.abort(user!.sub)
    },
    {
      requireAuth: true,
      body: t.Object({}),
    },
  )
  .post(
    "/blackjack-deal",
    async ({ body, set, headers, blackjackService, user }) => {
      try {
        const devMode = headers["x-dev-mode"] === "1" || (body as any).devMode
        return await blackjackService.deal(user!.sub, body.bid, devMode, body as any)
      } catch (err) {
        set.status = 400
        return { error: (err as Error).message }
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
    },
  )
  .post(
    "/blackjack-hit",
    async ({ body, set, headers, blackjackService, user }) => {
      try {
        const devMode = headers["x-dev-mode"] === "1" || (body as any).devMode
        return await blackjackService.hit(user!.sub, devMode, body as any)
      } catch (err) {
        set.status = 400
        return { error: (err as Error).message }
      }
    },
    {
      requireAuth: true,
      body: t.Object({}, { additionalProperties: true }),
    },
  )
  .post(
    "/blackjack-stand",
    async ({ body, set, headers, blackjackService, user }) => {
      try {
        const devMode = headers["x-dev-mode"] === "1" || (body as any).devMode
        return await blackjackService.stand(user!.sub, devMode)
      } catch (err) {
        set.status = 400
        return { error: (err as Error).message }
      }
    },
    {
      requireAuth: true,
      body: t.Object({}, { additionalProperties: true }),
    },
  )
  .post(
    "/blackjack-sync",
    async ({ blackjackService, user }) => {
      const state = await blackjackService.getState(user!.sub)
      return { state }
    },
    {
      requireAuth: true,
      body: t.Object({}),
    },
  )
  .post(
    "/blackjack-abandon",
    async ({ blackjackService, user }) => {
      blackjackService.abandon(user!.sub)
      return { success: true }
    },
    {
      requireAuth: true,
      body: t.Object({}),
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
          .where(eq(schema.users.id, user!.sub))
        return { success: true }
      } catch (err) {
        set.status = 400
        return { error: (err as Error).message }
      }
    },
    {
      requireAuth: true,
      body: t.Object({}),
    },
  )
  .post(
    "/rocket-launch",
    async ({ body, set, headers, rocketService, user }) => {
      try {
        const devMode = headers["x-dev-mode"] === "1" || (body as any).devMode
        return await rocketService.launch(user!.sub, body.bid, devMode, body as any)
      } catch (err) {
        set.status = 400
        return { error: (err as Error).message }
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
    },
  )
  .post(
    "/rocket-cashout",
    async ({ body, set, headers, rocketService, user }) => {
      try {
        const devMode = headers["x-dev-mode"] === "1" || (body as any).devMode
        return await rocketService.cashout(user!.sub, devMode)
      } catch (err) {
        set.status = 400
        return { error: (err as Error).message }
      }
    },
    {
      requireAuth: true,
      body: t.Object({}, { additionalProperties: true }),
    },
  )
  .post(
    "/rocket-poll",
    async ({ body, set, headers, rocketService, user }) => {
      try {
        const devMode = headers["x-dev-mode"] === "1" || (body as any).devMode
        return await rocketService.poll(user!.sub, devMode)
      } catch (err) {
        set.status = 400
        return { error: (err as Error).message }
      }
    },
    {
      requireAuth: true,
      body: t.Object({}, { additionalProperties: true }),
    },
  )
  .post(
    "/rocket-abandon",
    async ({ rocketService, user }) => {
      rocketService.abandon(user!.sub)
      return { success: true }
    },
    {
      requireAuth: true,
      body: t.Object({}),
    },
  )
  .post(
    "/rocket-dismiss",
    async ({ rocketService, user }) => {
      rocketService.dismiss(user!.sub)
      return { success: true }
    },
    {
      requireAuth: true,
      body: t.Object({}),
    },
  )
  .get(
    "/rocket-history",
    async ({ rocketService }) => {
      return rocketService.getHistory()
    },
  )
  .post(
    "/pachinko-drop",
    async ({ body, set, headers, pachinkoService, user }) => {
      try {
        const devMode = headers["x-dev-mode"] === "1" || (body as any).devMode
        return await pachinkoService.drop(user!.sub, body.bid, body.ratAmount, devMode, body as any)
      } catch (err) {
        set.status = 400
        return { error: (err as Error).message }
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
    },
  )
  .post(
    "/pachinko-settle",
    async ({ body, set, headers, pachinkoService, user }) => {
      try {
        const devMode = headers["x-dev-mode"] === "1" || (body as any).devMode
        return await pachinkoService.settle(user!.sub, body.slotIndexes, devMode, body as any)
      } catch (err) {
        set.status = 400
        return { error: (err as Error).message }
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
    },
  )
  .post(
    "/pachinko-sync",
    async ({ set, pachinkoService, user }) => {
      try {
        return await pachinkoService.sync(user!.sub)
      } catch (err) {
        set.status = 400
        return { error: (err as Error).message }
      }
    },
    {
      requireAuth: true,
      body: t.Object({}),
    },
  )
  .post(
    "/pachinko-abandon",
    async ({ pachinkoService, user }) => {
      pachinkoService.abandon(user!.sub)
      return { success: true }
    },
    {
      requireAuth: true,
      body: t.Object({}),
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
    },
  )
  .post(
    "/mines-start",
    async ({ body, set, headers, minesService, user }) => {
      try {
        const devMode = headers["x-dev-mode"] === "1" || (body as any).devMode
        return await minesService.start(user!.sub, body.bid, body.mineCount, devMode, body as any)
      } catch (err) {
        set.status = 400
        return { error: (err as Error).message }
      }
    },
    {
      requireAuth: true,
      body: t.Object({
        bid: t.Integer({ minimum: GAMBLING_MIN_BET, maximum: GAMBLING_MAX_BET }),
        mineCount: t.Integer({ minimum: 1, maximum: 10 }),
      }, { additionalProperties: true }),
    },
  )
  .post(
    "/mines-reveal",
    async ({ body, set, headers, minesService, user }) => {
      try {
        const devMode = headers["x-dev-mode"] === "1" || (body as any).devMode
        return await minesService.reveal(user!.sub, body.x, body.y, devMode, body as any)
      } catch (err) {
        set.status = 400
        return { error: (err as Error).message }
      }
    },
    {
      requireAuth: true,
      body: t.Object({
        x: t.Integer({ minimum: 0, maximum: 4 }),
        y: t.Integer({ minimum: 0, maximum: 4 }),
      }, { additionalProperties: true }),
    },
  )
  .post(
    "/mines-cashout",
    async ({ body, set, headers, minesService, user }) => {
      try {
        const devMode = headers["x-dev-mode"] === "1" || (body as any).devMode
        return await minesService.cashout(user!.sub, devMode)
      } catch (err) {
        set.status = 400
        return { error: (err as Error).message }
      }
    },
    {
      requireAuth: true,
      body: t.Object({}, { additionalProperties: true }),
    },
  )
  .post(
    "/mines-abort",
    async ({ minesService, user }) => {
      minesService.abort(user!.sub)
      return { success: true }
    },
    {
      requireAuth: true,
      body: t.Object({}),
    },
  )
  .post(
    "/calculate-move-path",
    async ({ body, db }) => {
      const { startingPosition, diceRoll } = body
      const allCells = await db
        .select({
          number: schema.cells.number,
          ladderTo: schema.cells.ladderTo,
          snakeTo: schema.cells.snakeTo,
        })
        .from(schema.cells)
      const result = calculateMovePath(startingPosition, diceRoll, allCells)
      return result
    },
    {
      body: t.Object({
        startingPosition: t.Number(),
        diceRoll: t.Number(),
      }),
    },
  )
