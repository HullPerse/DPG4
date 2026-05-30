import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema";
import { dbPlugin } from "../plugins/db.plugin";

type FileField = "image" | "audio";

const tables = {
  games: { table: schema.games, fields: ["image"] as const satisfies readonly FileField[] },
  items: { table: schema.items, fields: ["image"] as const satisfies readonly FileField[] },
  inventory: { table: schema.inventory, fields: ["image"] as const satisfies readonly FileField[] },
  market: { table: schema.market, fields: ["image"] as const satisfies readonly FileField[] },
  chats: { table: schema.chats, fields: ["image"] as const satisfies readonly FileField[] },
  ads: { table: schema.ads, fields: ["image", "audio"] as const satisfies readonly FileField[] },
  drawings: { table: schema.drawings, fields: ["image"] as const satisfies readonly FileField[] },
} as const;

type EntityKey = keyof typeof tables;

function isAllowedField(
  fields: readonly FileField[],
  field: string,
): field is FileField {
  return (fields as readonly string[]).includes(field);
}

export const filesRoute = new Elysia({ prefix: "/files" })
  .use(dbPlugin)
  .get(
    "/:entity/:id/:field",
    async ({ params, db, set }) => {
      const config = tables[params.entity as EntityKey];
      if (!config) {
        set.status = 404;
        return "Not found";
      }
      if (!isAllowedField(config.fields, params.field)) {
        set.status = 404;
        return "Not found";
      }

      const [row] = await db
        .select()
        .from(config.table)
        .where(eq(config.table.id, params.id));

      if (!row) {
        set.status = 404;
        return "Not found";
      }

      const record = row as Record<string, unknown>;
      const buffer = record[params.field];
      const mime =
        (record[`${params.field}Mime`] as string | null | undefined) ??
        "application/octet-stream";

      if (!(buffer instanceof Buffer)) {
        set.status = 404;
        return "Not found";
      }

      return new Response(new Uint8Array(buffer), {
        headers: { "Content-Type": mime },
      });
    },
    {
      params: t.Object({
        entity: t.String(),
        id: t.String(),
        field: t.String(),
      }),
      detail: { tags: ["files"], summary: "Download file blob" },
    },
  );
