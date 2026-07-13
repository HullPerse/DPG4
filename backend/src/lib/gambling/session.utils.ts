import { eq, and } from "drizzle-orm";
import * as schema from "@/db/schema.db";
import type { Db } from "@/types/server";
import { newId, nowIso } from "@/lib/index.utils";

export type GameType = "dice" | "blackjack" | "rocket" | "pachinko" | "mines";

export interface SessionRecord {
  id: string;
  userId: string;
  gameType: GameType;
  state: Record<string, unknown>;
  bid: number;
  phase: string;
}

export async function loadSession(
  db: Db,
  userId: string,
  gameType: GameType,
): Promise<SessionRecord | null> {
  const row = await db
    .select()
    .from(schema.gamblingSessions)
    .where(
      and(
        eq(schema.gamblingSessions.userId, userId),
        eq(schema.gamblingSessions.gameType, gameType),
        eq(schema.gamblingSessions.phase, "active"),
      ),
    )
    .get();

  if (!row) return null;

  return {
    id: row.id,
    userId: row.userId,
    gameType: row.gameType as GameType,
    state: JSON.parse(row.state) as Record<string, unknown>,
    bid: row.bid,
    phase: row.phase,
  };
}

export async function saveSession(
  db: Db,
  userId: string,
  gameType: GameType,
  state: Record<string, unknown>,
  bid: number,
) {
  const existing = await loadSession(db, userId, gameType);
  const now = nowIso();

  if (existing) {
    await db
      .update(schema.gamblingSessions)
      .set({
        state: JSON.stringify(state),
        bid,
        updated: now,
      })
      .where(eq(schema.gamblingSessions.id, existing.id));
    return existing.id;
  }

  const id = newId();
  await db.insert(schema.gamblingSessions).values({
    id,
    userId,
    gameType,
    state: JSON.stringify(state),
    bid,
    phase: "active",
    created: now,
    updated: now,
  });
  return id;
}

export async function closeSession(db: Db, userId: string, gameType: GameType) {
  await db
    .update(schema.gamblingSessions)
    .set({ phase: "settled", updated: nowIso() })
    .where(
      and(
        eq(schema.gamblingSessions.userId, userId),
        eq(schema.gamblingSessions.gameType, gameType),
      ),
    );
}

export async function deleteSession(db: Db, id: string) {
  await db
    .delete(schema.gamblingSessions)
    .where(eq(schema.gamblingSessions.id, id));
}
