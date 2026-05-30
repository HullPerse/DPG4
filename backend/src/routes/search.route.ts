import { Elysia, t } from "elysia";
import { sql } from "drizzle-orm";
import { dbPlugin } from "../plugins/db.plugin";
import * as schema from "../db/schema";
import { omitPassword, withRecordMeta } from "../lib/record";

export const searchRoute = new Elysia({ prefix: "/search" })
  .use(dbPlugin)
  .get(
    "/",
    async ({ query, db }) => {
      const q = (query.q ?? "").trim().toLowerCase();
      const limit = Math.min(Number(query.limit) || 20, 50);
      const pattern = `%${q}%`;

      if (!q) {
        return { users: [], games: [], items: [] };
      }

      const matchedUsers = await db
        .select()
        .from(schema.users)
        .where(sql`LOWER(${schema.users.username}) LIKE ${pattern}`)
        .limit(limit);

      const matchedGames = await db
        .select({
          id: schema.games.id,
          data: schema.games.data,
          status: schema.games.status,
          user: schema.games.user,
        })
        .from(schema.games)
        .where(sql`LOWER(json_extract(${schema.games.data}, '$.name')) LIKE ${pattern}`)
        .limit(limit);

      const matchedItems = await db
        .select({
          id: schema.items.id,
          type: schema.items.type,
          label: schema.items.label,
          description: schema.items.description,
          charge: schema.items.charge,
          rollable: schema.items.rollable,
          status: schema.items.status,
          hasImage: sql<boolean>`${schema.items.image} IS NOT NULL`,
          created: schema.items.created,
          updated: schema.items.updated,
        })
        .from(schema.items)
        .where(
          sql`LOWER(${schema.items.label}) LIKE ${pattern} OR LOWER(${schema.items.description}) LIKE ${pattern}`,
        )
        .limit(limit);

      return {
        users: matchedUsers.map((u) => withRecordMeta(omitPassword(u), "users")),
        games: matchedGames.map((g) => ({
          id: g.id,
          name: (g.data as { name?: string })?.name,
          status: g.status,
          user: g.user,
        })),
        items: matchedItems.map((i) => withRecordMeta(i, "items")),
      };
    },
    {
      query: t.Object({
        q: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
      detail: { tags: ["search"], summary: "Search users, games, items" },
    },
  );
