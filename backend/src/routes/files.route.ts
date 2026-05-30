import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema";

const tables = {
  games: { table: schema.games, fields: ["image"] as const },
  items: { table: schema.items, fields: ["image"] as const },
  inventory: { table: schema.inventory, fields: ["image"] as const },
  market: { table: schema.market, fields: ["image"] as const },
  chats: { table: schema.chats, fields: ["image"] as const },
  ads: { table: schema.ads, fields: ["image", "audio"] as const },
  drawings: { table: schema.drawings, fields: ["image"] as const },
};

import { dbPlugin } from "../plugins/db.plugin";

export const filesRoute = new Elysia({ prefix: "/files" })
  .use(dbPlugin)
  .get(
  "/:entity/:id/:field",
  async ({ params, db, set }) => {
    const config = tables[params.entity as keyof typeof tables];
    if (!config) {
      set.status = 404;
      return "Not found";
    }
    if (!config.fields.includes(params.field as (typeof config.fields)[number])) {
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

    const buffer = (row as Record<string, Buffer | null>)[params.field];
    const mime =
      (row as Record<string, string | null>)[`${params.field}Mime`] ??
      "application/octet-stream";

    if (!buffer) {
      set.status = 404;
      return "Not found";
    }

    return new Response(buffer, {
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
