import { Elysia, t } from "elysia";
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

      if (!q) {
        return { users: [], games: [], items: [] };
      }

      const users = await db.select().from(schema.users);
      const games = await db.select().from(schema.games);
      const items = await db.select().from(schema.items);

      const matchedUsers = users
        .filter((u) => u.username.toLowerCase().includes(q))
        .slice(0, limit)
        .map((u) => withRecordMeta(omitPassword(u), "users"));

      const matchedGames = games
        .filter((g) => {
          const data = g.data as { name?: string };
          return data.name?.toLowerCase().includes(q);
        })
        .slice(0, limit)
        .map((g) => ({
          id: g.id,
          name: (g.data as { name?: string })?.name,
          status: g.status,
          user: g.user,
        }));

      const matchedItems = items
        .filter(
          (i) =>
            i.label.toLowerCase().includes(q) ||
            i.description.toLowerCase().includes(q),
        )
        .slice(0, limit)
        .map((i) => withRecordMeta(i, "items"));

      return {
        users: matchedUsers,
        games: matchedGames,
        items: matchedItems,
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
