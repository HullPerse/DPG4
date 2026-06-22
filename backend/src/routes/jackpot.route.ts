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
    async ({ body, headers, user, jackpotService }) => {
      const devMode = headers["x-dev-mode"] === "1" || body.devMode === true;
      return await jackpotService.play(
        user.sub,
        devMode,
        body.devForceWin !== undefined ||
          body.devShowWinningNumber !== undefined
          ? body
          : undefined,
      );
    },
    {
      requireAuth: true,
      body: t.Object({
        devMode: t.Optional(t.Boolean()),
        devForceWin: t.Optional(t.Boolean()),
        devShowWinningNumber: t.Optional(t.Boolean()),
      }),
    },
  );
