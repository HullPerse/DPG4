import { eq, type SQL, type SQLWrapper } from "drizzle-orm"
import type { Db } from "@/types/server"

export async function findById<T extends Record<string, unknown>>(
  db: Db,
  table: SQLWrapper,
  id: string,
): Promise<T | undefined> {
  const idCol = (table as Record<string, unknown>).id as SQL
  const [row] = await db.select().from(table).where(eq(idCol, id))
  return row as T | undefined
}

export async function exists(db: Db, table: SQLWrapper, id: string): Promise<boolean> {
  const row = await findById(db, table, id)
  return !!row
}

export async function deleteById(
  db: Db,
  table: SQLWrapper,
  id: string,
): Promise<boolean> {
  const idCol = (table as Record<string, unknown>).id as SQL
  const [row] = await db.select().from(table).where(eq(idCol, id))
  if (!row) return false
  await db.delete(table).where(eq(idCol, id))
  return true
}

export async function countAll(db: Db, table: SQLWrapper): Promise<number> {
  const result = await db.select({ count: db._.dialect.math.count() }).from(table)
  return Number(result[0]?.count ?? 0)
}
