import { Elysia, t } from "elysia";
import { authPlugin } from "../plugins/auth.plugin";
import { APP_META, WINDOW_META, LINKS } from "../lib/config.data";

export const configRoute = new Elysia({ prefix: "/utils" })
  .use(authPlugin)
  .get(
    "/config",
    ({ user }) => {
      const apps = user?.isAdmin
        ? APP_META
        : APP_META.filter((a) => !a.adminOnly);

      return { apps, windows: WINDOW_META, links: LINKS };
    },
    {
      detail: {
        tags: ["utils"],
        summary: "UI config (apps, windows, game links)",
      },
    },
  );
