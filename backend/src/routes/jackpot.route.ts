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
      if (!user?.sub) return { error: "Unauthorized" };
      const devMode = headers["x-dev-mode"] === "1" || (body as any)?.devMode;
      return await jackpotService.play(user.sub, devMode, (body ?? {}) as any);
    },
    {
      body: t.Object({}, { additionalProperties: true }),
      detail: { tags: ["jackpot"], summary: "Play the jackpot game" },
    },
  );
