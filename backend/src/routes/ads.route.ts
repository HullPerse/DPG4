import { Elysia, t } from "elysia"
import { eq } from "drizzle-orm"
import * as schema from "@/db/schema.db"
import { newId, nowIso, withRecordMeta, STATUS_EFFECTS } from "@/lib/index.utils"
import { parseFileInput } from "@/lib/files.utils"
import { broadcast } from "@/lib/websocket.utils"
import Logger from "@/lib/logger.utils"
import databasePlugin from "@/plugins/database.plugin"
import servicesPlugin from "@/services.server"

const SUBSCRIPTION_COST = 2
const logger = new Logger("ADS")

export default new Elysia({ prefix: "/ads" })
  .use(databasePlugin)
  .use(servicesPlugin)
  .get(
    "/",
    async ({ db, query }) => {
      let q = db.select().from(schema.ads)
      if (query.search) {
        const s = query.search.toLowerCase()
        const rows = await q
        return rows
          .filter((r) => r.text?.toLowerCase().includes(s))
          .map((r) => withRecordMeta(r, "ads"))
      }
      const rows = await q
      return rows.map((r) => withRecordMeta(r, "ads"))
    },
    {
      query: t.Optional(
        t.Object({
          search: t.Optional(t.String()),
        }),
      ),
    },
  )
  .post(
    "/",
    async ({ body, db }) => {
      const id = newId()
      const ts = nowIso()
      const imageFile = parseFileInput(body.image)
      const audioFile = parseFileInput(body.audio)

      await db.insert(schema.ads).values({
        id,
        owner: body.owner,
        text: body.text ?? "",
        image: imageFile?.data ?? null,
        imageMime: imageFile?.mime ?? null,
        audio: audioFile?.data ?? null,
        audioMime: audioFile?.mime ?? null,
        created: ts,
        updated: ts,
      })

      broadcast("ads", "create", id)
      const ownerName = (body.owner as { username?: string } | undefined)
        ?.username
      logger.setAuthor(ownerName ?? "").info(`created ad ${body.text}`)
      return withRecordMeta(
        (await db.select().from(schema.ads).where(eq(schema.ads.id, id)))[0]!,
        "ads",
      )
    },
    {
      body: t.Object({
        owner: t.Any(),
        text: t.Optional(t.String()),
        image: t.Optional(t.Any()),
        audio: t.Optional(t.Any()),
      }),
    },
  )
  .delete(
    "/:id",
    async ({ params, db }) => {
      await db.delete(schema.ads).where(eq(schema.ads.id, params.id))
      broadcast("ads", "delete", params.id)
      logger.info(`deleted ad ${params.id}`)
      return { ok: true }
    },
    { params: t.Object({ id: t.String() }) },
  )
  .post(
    "/subscribe",
    async ({ body, userService, activityService }) => {
      const user = await userService.getById(body.userId)
      if (!user || user.money < SUBSCRIPTION_COST) {
        logger.setAuthor(user?.username ?? "").info("subscription failed insufficient funds")
        return { ok: false }
      }

      await userService.score(body.userId, -SUBSCRIPTION_COST)
      await userService.changeStatus(body.userId, STATUS_EFFECTS.SUBSCRIBED, "add")

      await activityService.create({
        author: body.userId,
        image: user.avatar,
        text: `${user.username} оформил подписку за ${SUBSCRIPTION_COST} чубриков`,
      })

      logger.setAuthor(user.username).info("subscribed")
      return { ok: true }
    },
    { body: t.Object({ userId: t.String() }) },
  )
  .post(
    "/unsubscribe",
    async ({ body, userService, activityService }) => {
      const user = await userService.getById(body.userId)
      if (!user) return { ok: false }

      await userService.changeStatus(body.userId, STATUS_EFFECTS.SUBSCRIBED, "remove")
      await activityService.create({
        author: body.userId,
        image: user.avatar,
        text: `${user.username} не хватило денег на подписку`,
      })
      logger.setAuthor(user.username).info("unsubscribed")
      return { ok: true }
    },
    { body: t.Object({ userId: t.String() }) },
  )
