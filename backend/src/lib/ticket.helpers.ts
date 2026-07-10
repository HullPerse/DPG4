import { eq, sql } from "drizzle-orm";
import * as schema from "@/db/schema.db";
import type { Db } from "@/types/server";
import { nowIso } from "@/lib/index.utils";
import { broadcast } from "@/lib/websocket.utils";

export async function deductTickets(db: Db, userId: string, amount: number) {
  await db
    .update(schema.users)
    .set({ tickets: sql`tickets - ${amount}`, updated: nowIso() })
    .where(eq(schema.users.id, userId));
  broadcast("users", "update", userId);
}

export async function addTickets(db: Db, userId: string, amount: number) {
  await db
    .update(schema.users)
    .set({ tickets: sql`tickets + ${amount}`, updated: nowIso() })
    .where(eq(schema.users.id, userId));
  broadcast("users", "update", userId);
}
