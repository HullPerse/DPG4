import { Elysia, t } from "elysia";
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
    async ({ body, headers, user, jackpotService }) => {
      const devMode = headers["x-dev-mode"] === "1" || body.devMode === true;
      return await jackpotService.play(
        user.sub,
        devMode,
        body.devForceWin !== undefined || body.devShowWinningNumber !== undefined
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
      detail: { tags: ["jackpot"], summary: "Play the jackpot game" },
    },
  );
