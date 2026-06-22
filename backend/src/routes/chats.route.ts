import { Elysia, t } from "elysia"
import { and, eq, inArray, or, sql, type SQL } from "drizzle-orm"
import * as schema from "@/db/schema.db"
import { newId, nowIso, withRecordMeta } from "@/lib/index.utils"
import { parseFileInput } from "@/lib/files.utils"
import { broadcast } from "@/lib/websocket.utils"
import Logger from "@/lib/logger.utils"
import databasePlugin from "@/plugins/database.plugin"
import servicesPlugin from "@/services.server"

const logger = new Logger("CHATS")

function mapChat(row: typeof schema.chats.$inferSelect) {
  return {
    ...withRecordMeta({ ...row, updated: row.created }, "chats"),
    isRead: row.isRead,
  }
}

export default new Elysia({ prefix: "/chats" })
  .use(databasePlugin)
  .use(servicesPlugin)
  .get(
    "/",
    async ({ db, query }) => {
    const conditions: SQL[] = []

    if (query.receiverId && query.senderId) {
      conditions.push(
        or(
          and(
            sql`json_extract(data, '$.sender.id') = ${query.senderId}`,
            sql`json_extract(data, '$.receiver.id') = ${query.receiverId}`,
          ),
          and(
            sql`json_extract(data, '$.sender.id') = ${query.receiverId}`,
            sql`json_extract(data, '$.receiver.id') = ${query.senderId}`,
          ),
        )!,
      )
    } else if (query.receiverId === "global") {
      conditions.push(sql`json_extract(data, '$.receiver.id') = 'global'`)
    } else if (query.unreadFor) {
      conditions.push(
        and(
          sql`json_extract(data, '$.receiver.id') = ${query.unreadFor}`,
          eq(schema.chats.isRead, false),
        )!,
      )
    }

    const orderCol =
      query.sort === "created" ? schema.chats.created : schema.chats.created
    const orderDir = query.sort === "created" ? "ASC" : "DESC"

    const rows = await db
      .select()
      .from(schema.chats)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(
        orderDir === "ASC" ? sql`${orderCol} ASC` : sql`${orderCol} DESC`,
      )

    return rows.map(mapChat)
  },
  {
    query: t.Optional(
      t.Object({
        senderId: t.Optional(t.String()),
        receiverId: t.Optional(t.String()),
        unreadFor: t.Optional(t.String()),
        sort: t.Optional(t.String()),
      }),
    ),
  },
)
  .post(
    "/",
    async ({ body, db, userService }) => {
      const id = newId()
      const created = nowIso()
      const imageFile = parseFileInput(body.image)

      let data = body.data
      if (body.senderId && body.receiverId) {
        const sender = await userService.getById(body.senderId)
        const isGlobal = body.receiverId === "global"
        const receiver = isGlobal
          ? null
          : await userService.getById(body.receiverId)

        data = {
          sender: {
            id: body.senderId,
            username: sender?.username ?? "",
            avatar: sender?.avatar ?? "",
            color: sender?.color ?? "",
          },
          receiver: isGlobal
            ? {
                id: "global",
                username: "Глобальный чат",
                avatar: "🌐",
                color: "#f6c177",
              }
            : {
                id: body.receiverId,
                username: receiver?.username ?? "",
                avatar: receiver?.avatar ?? "",
                color: receiver?.color ?? "",
              },
        }
      }

      await db.insert(schema.chats).values({
        id,
        data,
        message: body.message ?? "",
        image: imageFile?.data ?? null,
        imageMime: imageFile?.mime ?? null,
        isRead: false,
        created,
      })

      broadcast("chats", "create", id)
      const senderUsername = (
        data as { sender?: { username?: string } } | undefined
      )?.sender?.username
      const receiverLabel =
        (data as { receiver?: { username?: string } } | undefined)?.receiver
          ?.username ?? "global"
      logger.setAuthor(senderUsername ?? "").info(`sent message to:${receiverLabel}`)
      const [row] = await db
        .select()
        .from(schema.chats)
        .where(eq(schema.chats.id, id))
      return mapChat(row!)
    },
    {
      body: t.Object({
        data: t.Optional(t.Any()),
        senderId: t.Optional(t.String()),
        receiverId: t.Optional(t.String()),
        message: t.Optional(t.String()),
        image: t.Optional(t.Any()),
      }),
    },
  )
  .patch(
    "/:id",
    async ({ params, body, db }) => {
      const patch: Partial<typeof schema.chats.$inferInsert> = {}
      if (body.message !== undefined) patch.message = body.message
      if (body.isRead !== undefined) patch.isRead = body.isRead
      await db
        .update(schema.chats)
        .set(patch)
        .where(eq(schema.chats.id, params.id))
      broadcast("chats", "update", params.id)
      const [row] = await db
        .select()
        .from(schema.chats)
        .where(eq(schema.chats.id, params.id))
      logger.info(`updated message ${params.id}`)
      return mapChat(row!)
    },
    {
      body: t.Object({
        message: t.Optional(t.String()),
        isRead: t.Optional(t.Boolean()),
      }),
    },
  )
  .post(
    "/mark-read",
    async ({ body, db }) => {
      await db
        .update(schema.chats)
        .set({ isRead: true })
        .where(inArray(schema.chats.id, body.ids))
      for (const id of body.ids) broadcast("chats", "update", id)
      logger.info(`marked messages read count:${body.ids.length}`)
      return { ok: true }
    },
    {
      body: t.Object({ ids: t.Array(t.String()) }),
    },
  )
  .delete(
    "/:id",
    async ({ params, db }) => {
      await db.delete(schema.chats).where(eq(schema.chats.id, params.id))
      broadcast("chats", "delete", params.id)
      logger.info(`deleted message ${params.id}`)
      return { ok: true }
    },
    { params: t.Object({ id: t.String() }) },
  )
  .get(
    "/thread/:sender/:receiver",
    async ({ params, db, userService }) => {
    const chats = await db
      .select()
      .from(schema.chats)
      .where(
        or(
          and(
            sql`json_extract(data, '$.sender.id') = ${params.sender}`,
            sql`json_extract(data, '$.receiver.id') = ${params.receiver}`,
          ),
          and(
            sql`json_extract(data, '$.sender.id') = ${params.receiver}`,
            sql`json_extract(data, '$.receiver.id') = ${params.sender}`,
          ),
        ),
      )
    const user = await userService.getById(params.receiver)
    return { chat: chats.map(mapChat), user }
  },
  {
    params: t.Object({ sender: t.String(), receiver: t.String() }),
  },
)
  .get(
    "/:id",
    async ({ params, db, set }) => {
    const [row] = await db
      .select()
      .from(schema.chats)
      .where(eq(schema.chats.id, params.id))
    if (!row) {
      set.status = 404
      return { error: "Not found" }
    }
    return mapChat(row)
  },
  { params: t.Object({ id: t.String() }) },
)
