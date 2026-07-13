import { Elysia, t } from "elysia";
import servicesPlugin from "@/services.server";
import { authPlugin, databasePlugin } from "@/plugins/index.plugin";

export default new Elysia({ prefix: "/utils/jackpot" })
  .use(databasePlugin)
  .use(servicesPlugin)
  .use(authPlugin)

  .get("/", async ({ jackpotService }) => {
    return await jackpotService.getStatus();
  })

  .post(
    "/play",
    async ({ body, user, jackpotService }) => {
      const devMode = user.isAdmin &&
        (body.devForceWin !== undefined || body.devShowWinningNumber !== undefined);
      return await jackpotService.play(
        user.sub,
        devMode,
        devMode ? body : undefined,
      );
    },
    {
      requireAuth: true,
      body: t.Object({
        devForceWin: t.Optional(t.Boolean()),
        devShowWinningNumber: t.Optional(t.Boolean()),
      }),
    },
  );
