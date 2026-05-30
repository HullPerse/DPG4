import { eq, desc } from "drizzle-orm";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import * as schema from "../db/schema";
import { newId } from "../lib/ids";
import { nowIso } from "../lib/dates";
import { withRecordMeta } from "../lib/record";
import { broadcast } from "../lib/ws";

type Db = BunSQLiteDatabase<typeof schema>;

export async function createActivity(
  db: Db,
  data: {
    author?: string;
    image?: string;
    type?: string;
    text: string;
  },
) {
  const id = newId();
  const created = nowIso();
  await db.insert(schema.activity).values({
    id,
    author: data.author ?? null,
    image: data.image ?? null,
    type: data.type ?? "emoji",
    text: data.text,
    created,
  });
  broadcast("activity", "create", id);
  return withRecordMeta(
    {
      id,
      author: data.author ?? null,
      image: data.image ?? null,
      type: data.type ?? "emoji",
      text: data.text,
      created,
      updated: created,
    },
    "activity",
  );
}

export async function listActivity(db: Db, limit = 50) {
  const rows = await db
    .select()
    .from(schema.activity)
    .orderBy(desc(schema.activity.created))
    .limit(limit);
  return rows.map((r) =>
    withRecordMeta({ ...r, updated: r.created }, "activity"),
  );
}

export async function getLatestActivity(db: Db) {
  const [row] = await db
    .select()
    .from(schema.activity)
    .orderBy(desc(schema.activity.created))
    .limit(1);
  return row
    ? withRecordMeta({ ...row, updated: row.created }, "activity")
    : null;
}

export async function getActivityById(db: Db, id: string) {
  const [row] = await db
    .select()
    .from(schema.activity)
    .where(eq(schema.activity.id, id));
  return row
    ? withRecordMeta({ ...row, updated: row.created }, "activity")
    : null;
}
