import { Elysia, t } from "elysia"
import Logger from "@/lib/logger.utils"
import servicesPlugin from "@/services.server"
import authPlugin from "@/plugins/auth.plugin"

const logger = new Logger("TRADE")

export default new Elysia({ prefix: "/trade" })
  .use(servicesPlugin)
  .use(authPlugin)
  .post(
    "/",
    async ({ body, economyService, user, set }) => {
      if (user.sub !== body.currentUser.id) {
        set.status = 403
        return { error: "Unauthorized" }
      }
      const result = await economyService.tradeInventory(
        body.currentUser,
        body.otherUser,
      )
      logger.info(`trade completed ${body.currentUser.id} <-> ${body.otherUser.id}`)
      return result
    },
    {
      requireAuth: true,
      body: t.Object({
        currentUser: t.Object({
          id: t.String(),
          money: t.Number(),
          items: t.Array(t.String()),
        }),
        otherUser: t.Object({
          id: t.String(),
          money: t.Number(),
          items: t.Array(t.String()),
        }),
      }),
    },
  )
