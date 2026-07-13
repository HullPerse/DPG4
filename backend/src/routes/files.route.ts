import { Elysia, t } from "elysia"
import { eq } from "drizzle-orm"
import * as schema from "@/db/schema.db"
import databasePlugin from "@/plugins/database.plugin"
import type { FileField } from "@/types/files"

const tables = {
  games: { table: schema.games, fields: ["image"] as const satisfies readonly FileField[] },
  items: { table: schema.items, fields: ["image"] as const satisfies readonly FileField[] },
  inventory: { table: schema.inventory, fields: ["image"] as const satisfies readonly FileField[] },
  market: { table: schema.market, fields: ["image"] as const satisfies readonly FileField[] },
  chats: { table: schema.chats, fields: ["image"] as const satisfies readonly FileField[] },
  ads: { table: schema.ads, fields: ["image", "audio"] as const satisfies readonly FileField[] },
  drawings: { table: schema.drawings, fields: ["image"] as const satisfies readonly FileField[] },
} as const

type EntityKey = keyof typeof tables

function isAllowedField(
  fields: readonly FileField[],
  field: string,
): field is FileField {
  return (fields as readonly string[]).includes(field)
}

export default new Elysia({ prefix: "/files" })
  .use(databasePlugin)
  .get(
    "/:entity/:id/:field",
    async ({ params, db, set }) => {
      const config = tables[params.entity as EntityKey]
      if (!config) {
        set.status = 404
        return { error: "Not found" }
      }
      if (!isAllowedField(config.fields, params.field)) {
        set.status = 404
        return { error: "Not found" }
      }

      const [row] = await db
        .select()
        .from(config.table)
        .where(eq(config.table.id, params.id))

      if (!row) {
        set.status = 404
        return { error: "Not found" }
      }

      const record = row as Record<string, unknown>
      const buffer = record[params.field]
      const mime =
        (record[`${params.field}Mime`] as string | null | undefined) ??
        "application/octet-stream"

      if (!(buffer instanceof Buffer)) {
        set.status = 404
        return { error: "Not found" }
      }

      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": mime,
          "Cache-Control": "public, max-age=86400",
        },
      })
    },
    {
      params: t.Object({
        entity: t.String(),
        id: t.String(),
        field: t.String(),
      }),
    },
  )
