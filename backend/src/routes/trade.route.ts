import { Elysia, t } from "elysia"
import Logger from "@/lib/logger.utils"
import servicesPlugin from "@/services.server"

const logger = new Logger("TRADE")

export default new Elysia({ prefix: "/trade" })
  .use(servicesPlugin)
  .post(
    "/",
    async ({ body, economyService }) => {
      const result = await economyService.tradeInventory(
        body.currentUser,
        body.otherUser,
      )
      logger.info(`trade completed ${body.currentUser.id} <-> ${body.otherUser.id}`)
      return result
    },
    {
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
