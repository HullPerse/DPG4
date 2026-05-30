import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  like,
  or,
  type SQL,
} from "drizzle-orm";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import * as schema from "../db/schema";
import { ADMIN_SCHEMA } from "./admin-schema";

type AnyTable = typeof schema.users;
type Db = BunSQLiteDatabase<typeof schema>;

const tables: Record<string, AnyTable> = {
  users: schema.users,
  games: schema.games,
  presets: schema.presets,
  items: schema.items,
  inventory: schema.inventory,
  market: schema.market,
  activity: schema.activity,
  chats: schema.chats,
  rules: schema.rules,
  ads: schema.ads,
  drawings: schema.drawings,
  cells: schema.cells,
};

export function getAdminTable(name: string): AnyTable | undefined {
  return tables[name];
}

function columnOf(table: AnyTable, field: string) {
  const col = (table as Record<string, unknown>)[field];
  return col ?? null;
}

function buildWhere(
  table: AnyTable,
  tableName: string,
  query: Record<string, unknown>,
): SQL | undefined {
  const meta = ADMIN_SCHEMA[tableName];
  if (!meta) return undefined;

  const parts: SQL[] = [];

  if (query._ids && typeof query._ids === "string") {
    const ids = query._ids.split(",").filter(Boolean);
    if (ids.length) parts.push(inArray((table as typeof schema.users).id, ids));
  }

  const q = typeof query.q === "string" ? query.q.trim() : "";
  if (q) {
    const pattern = `%${q}%`;
    const searchParts: SQL[] = [];
    for (const field of meta.searchFields) {
      const col = columnOf(table, field);
      if (col) searchParts.push(like(col as never, pattern));
    }
    if (searchParts.length) parts.push(or(...searchParts)!);
  }

  for (const [key, raw] of Object.entries(query)) {
    if (key.startsWith("_") || key === "q") continue;
    if (raw === undefined || raw === null || raw === "") continue;
    const col = columnOf(table, key);
    if (!col) continue;
    const value = String(raw);
    if (key === "id" || key.endsWith("Id") || key === "owner") {
      parts.push(eq(col as never, value));
    } else {
      parts.push(like(col as never, `%${value}%`));
    }
  }

  if (!parts.length) return undefined;
  return and(...parts);
}

export async function listAdminRows(
  db: Db,
  tableName: string,
  query: Record<string, unknown>,
) {
  const table = tables[tableName];
  const meta = ADMIN_SCHEMA[tableName];
  if (!table || !meta) return null;

  const sortField =
    typeof query._sort === "string" && columnOf(table, query._sort)
      ? query._sort
      : "id";
  const sortCol = columnOf(table, sortField) ?? (table as typeof schema.users).id;
  const sortDir =
    String(query._order ?? "ASC").toLowerCase() === "desc" ? desc : asc;

  const page = Math.max(1, parseInt(String(query._page)) || 1);
  const perPage = Math.min(
    200,
    Math.max(1, parseInt(String(query._perPage)) || 50),
  );
  const offset = (page - 1) * perPage;

  const where = buildWhere(table, tableName, query);

  const countQuery = db.select({ total: count() }).from(table);
  const [{ total }] = where
    ? await countQuery.where(where)
    : await countQuery;

  let rowsQuery = db.select().from(table).orderBy(sortDir(sortCol as never));
  if (where) rowsQuery = rowsQuery.where(where) as typeof rowsQuery;
  const data = await rowsQuery.limit(perPage).offset(offset);

  return { data, total: Number(total) };
}

export async function getAdminStats(db: Db) {
  const counts: Record<string, number> = {};
  for (const name of Object.keys(tables)) {
    const table = tables[name]!;
    const [{ total }] = await db.select({ total: count() }).from(table);
    counts[name] = Number(total);
  }
  return counts;
}
