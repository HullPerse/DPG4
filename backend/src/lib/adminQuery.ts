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
import { ADMIN_SCHEMA } from "./adminSchema";
import { ADMIN_TABLES, adminTableColumn, type AdminTable } from "./adminTables";
import { cacheGet, cacheSet, cacheDel } from "./cache";

type Db = BunSQLiteDatabase<typeof schema>;

function buildWhere(
  table: AdminTable,
  tableName: string,
  query: Record<string, unknown>,
): SQL | undefined {
  const meta = ADMIN_SCHEMA[tableName];
  if (!meta) return undefined;

  const parts: SQL[] = [];

  if (query._ids && typeof query._ids === "string") {
    const ids = query._ids.split(",").filter(Boolean);
    if (ids.length) {
      const idCol = adminTableColumn(table, "id");
      if (idCol) parts.push(inArray(idCol as never, ids));
    }
  }

  const q = typeof query.q === "string" ? query.q.trim() : "";
  if (q) {
    const pattern = `%${q}%`;
    const searchParts: SQL[] = [];
    for (const field of meta.searchFields) {
      const col = adminTableColumn(table, field);
      if (col) searchParts.push(like(col as never, pattern));
    }
    if (searchParts.length) parts.push(or(...searchParts)!);
  }

  for (const [key, raw] of Object.entries(query)) {
    if (key.startsWith("_") || key === "q") continue;
    if (raw === undefined || raw === null || raw === "") continue;
    const col = adminTableColumn(table, key);
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
  const table = ADMIN_TABLES[tableName as keyof typeof ADMIN_TABLES];
  const meta = ADMIN_SCHEMA[tableName];
  if (!table || !meta) return null;

  const defaultSort = adminTableColumn(table, "created") ? "created" : "id";
  const sortField =
    typeof query._sort === "string" && adminTableColumn(table, query._sort)
      ? query._sort
      : defaultSort;
  const sortCol =
    adminTableColumn(table, sortField) ??
    adminTableColumn(table, defaultSort);
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
  const [{ total }] = where ? await countQuery.where(where) : await countQuery;

  let rowsQuery = db
    .select()
    .from(table)
    .orderBy(sortDir(sortCol as never));
  if (where) rowsQuery = rowsQuery.where(where) as typeof rowsQuery;
  const data = await rowsQuery.limit(perPage).offset(offset);

  return { data, total: Number(total) };
}

const STATS_CACHE_KEY = "admin:stats";
const STATS_TTL = 30_000;

export async function getAdminStats(db: Db) {
  const cached = await cacheGet<Record<string, number>>(STATS_CACHE_KEY);
  if (cached) return cached;

  const counts: Record<string, number> = {};
  for (const name of Object.keys(ADMIN_TABLES)) {
    const table = ADMIN_TABLES[name as keyof typeof ADMIN_TABLES];
    const [{ total }] = await db.select({ total: count() }).from(table);
    counts[name] = Number(total);
  }

  await cacheSet(STATS_CACHE_KEY, counts, STATS_TTL);
  return counts;
}

export function invalidateAdminStatsCache() {
  void cacheDel(STATS_CACHE_KEY);
}
