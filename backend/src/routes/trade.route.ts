import { Elysia, t } from "elysia";
import { logger } from "../lib/logger";
import { servicesPlugin } from "../services.server";

export const tradeRoute = new Elysia({ prefix: "/trade" })
  .use(servicesPlugin)
  .post(
    "/",
    async ({ body, economyService }) => {
      const result = await economyService.tradeInventory(
        body.currentUser,
        body.otherUser,
      );
      logger.info(
        null,
        "trade completed",
        `${body.currentUser.id} ↔ ${body.otherUser.id}`,
      );
      return result;
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
  );
