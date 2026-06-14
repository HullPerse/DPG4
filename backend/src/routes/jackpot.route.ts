import { Elysia } from "elysia";
import { authPlugin } from "../plugins/auth.plugin";
import { servicesPlugin } from "../services.server";
import { dbPlugin } from "../plugins/db.plugin";

export const jackpotRoute = new Elysia({ prefix: "/utils/jackpot" })
  .use(dbPlugin)
  .use(servicesPlugin)
  .use(authPlugin)

  .get(
    "/",
    async ({ jackpotService }) => {
      return await jackpotService.getStatus();
    },
    {
      detail: { tags: ["jackpot"], summary: "Get jackpot status" },
    },
  )

  .post(
    "/play",
    async ({ user, jackpotService }) => {
      if (!user?.sub) return { error: "Unauthorized" };
      return await jackpotService.play(user.sub);
    },
    {
      detail: { tags: ["jackpot"], summary: "Play the jackpot game" },
    },
  );