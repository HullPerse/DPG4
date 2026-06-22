import { Elysia } from "elysia"
import authPlugin from "@/plugins/auth.plugin"
import { APP_META, WINDOW_META, LINKS } from "@/lib/config.data"
import { MODEL_CONFIGS } from "@/lib/model.config"

export default new Elysia({ prefix: "/utils" })
  .use(authPlugin)
  .get(
    "/config",
    ({ user }) => {
      const apps = user?.isAdmin
        ? APP_META
        : APP_META.filter((a) => !a.adminOnly)

      return { apps, windows: WINDOW_META, links: LINKS }
    },
  )
  .get(
    "/model-configs",
    () => {
      return MODEL_CONFIGS
    },
  )
