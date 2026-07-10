import { Elysia, t } from "elysia";
import { rawDb } from "@/db/index.db";
import { withRecordMeta } from "@/lib/index.utils";
import type { FtsUserRow, FtsGameRow, FtsItemRow } from "@/types/search";
import type { DbTimestamps } from "@/types/server";

export default new Elysia({ prefix: "/search" }).get(
  "/",
  async ({ query }) => {
    const q = (query.q ?? "").trim().toLowerCase();
    const limit = Math.min(Number(query.limit) || 20, 50);

    if (!q) {
      return { users: [], games: [], items: [] };
    }

    const ftsQuery = q
      .split(/\s+/)
      .map((w) => `"${w.replace(/[^a-zа-яё0-9_-]/gi, "")}"*`)
      .join(" ");

    const users = rawDb
      .query<FtsUserRow, [string, number]>(
        `SELECT u.id, u.username, u.avatar, u.color, u.status, u.money, u.position, u.is_admin AS isAdmin, u.created
           FROM users_fts uf JOIN users u ON u.rowid = uf.rowid
           WHERE users_fts MATCH ? ORDER BY rank LIMIT ?`,
      )
      .all(ftsQuery, limit) as FtsUserRow[];

    const games = rawDb
      .query<FtsGameRow, [string, number]>(
        `SELECT g.id, g.data, g.status, g.user
           FROM games_fts gf JOIN games g ON g.rowid = gf.rowid
           WHERE games_fts MATCH ? ORDER BY rank LIMIT ?`,
      )
      .all(ftsQuery, limit) as FtsGameRow[];

    const items = rawDb
      .query<FtsItemRow, [string, number]>(
        `SELECT i.id, i.type, i.label, i.description, i.charge, i.rollable, i.status,
                  i.image_mime AS imageMime, i.image IS NOT NULL AS hasImage, i.created, i.updated
           FROM items_fts if JOIN items i ON i.rowid = if.rowid
           WHERE items_fts MATCH ? ORDER BY rank LIMIT ?`,
      )
      .all(ftsQuery, limit) as FtsItemRow[];

    return {
      users: users.map((u) => ({
        ...withRecordMeta(u as unknown as DbTimestamps, "users"),
        passwordHash: undefined,
      })),
      games: games.map((g) => ({
        id: g.id,
        name: (JSON.parse(g.data) as { name?: string })?.name,
        status: g.status,
        user: g.user ? JSON.parse(g.user) : null,
      })),
      items: items.map((i) => ({
        id: i.id,
        type: i.type,
        label: i.label,
        description: i.description,
        charge: i.charge,
        rollable: !!i.rollable,
        status: i.status ? JSON.parse(i.status) : null,
        imageMime: i.imageMime,
        hasImage: !!i.hasImage,
        created: i.created,
        updated: i.updated,
      })),
    };
  },
  {
    query: t.Object({
      q: t.Optional(t.String()),
      limit: t.Optional(t.String()),
    }),
  },
);
