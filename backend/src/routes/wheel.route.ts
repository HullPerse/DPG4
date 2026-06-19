import { Elysia, t } from "elysia"
import * as schema from "@/db/schema.db"
import { newId, nowIso } from "@/lib/index.utils"
import { SPIN_COST } from "@/lib/gambling.constants"
import authPlugin from "@/plugins/auth.plugin"
import databasePlugin from "@/plugins/database.plugin"
import servicesPlugin from "@/services.server"
import Logger from "@/lib/logger.utils"

const logger = new Logger("WHEEL")

const WheelItemSchema = t.Object({
  id: t.String(),
  label: t.String(),
  image: t.String(),
  type: t.String(),
})

function fisherYatesShuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  const bytes = new Uint32Array(a.length)
  crypto.getRandomValues(bytes)
  for (let i = a.length - 1; i > 0; i--) {
    const j = bytes[i] % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickWinner(length: number): number {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0] % length
}

export default new Elysia({ prefix: "/wheel" })
  .use(databasePlugin)
  .use(servicesPlugin)
  .use(authPlugin)
  .post(
    "/spin",
    async ({ body, user, set, db, userService }) => {
      const { items, free, listType } = body
      if (!Array.isArray(items) || items.length === 0) {
        set.status = 400
        return { error: "Items array is required" }
      }

      const currentUser = await userService.getById(user.sub)

      if (!free) {
        if (!currentUser || currentUser.money < SPIN_COST) {
          set.status = 402
          return { error: "Недостаточно чубриков" }
        }
        await userService.score(user.sub, -SPIN_COST)
      }

      const shuffled = fisherYatesShuffle(items)
      const winnerIndex = pickWinner(shuffled.length)
      const winner = shuffled[winnerIndex]

      const id = newId()
      const ts = nowIso()
      await db.insert(schema.history).values({
        id,
        userId: user.sub,
        owner: currentUser
          ? { id: currentUser.id, username: currentUser.username }
          : null,
        type: "wheel",
        label: winner.label,
        image: winner.type === "image" ? winner.image : "",
        bid: free ? 0 : SPIN_COST,
        payout: 0,
        net: free ? 0 : -SPIN_COST,
        data: {
          itemId: winner.id,
          itemType: winner.type,
          listType: listType ?? "general",
          free,
        },
        created: ts,
      })

      return { shuffled, winnerIndex }
    },
    {
      body: t.Object({
        items: t.Array(WheelItemSchema),
        free: t.Boolean(),
        listType: t.Optional(t.String()),
      }),
      requireAuth: true,
    },
  )
