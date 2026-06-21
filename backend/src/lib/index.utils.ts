import type { Db, DbTimestamps } from "@/types/server";
import { COLLECTION_IDS } from "../server.config";
import * as schema from "@/db/schema.db";
import { eq } from "drizzle-orm";

export function newId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 15);
}

export function nowIso(): string {
  return new Date().toISOString();
}

export const USER_ACTIONS = {
  MOVE_POSITIVE: "MOVE_POSITIVE",
  MOVE_NEGATIVE: "MOVE_NEGATIVE",
} as const;

export const STATUS_EFFECTS = {
  EPHEMERALITY: "Эфемерность",
  GYPSY_BARON_BLESSING: "Благословление цыганского барона",
  BORSCH: "Борщ",
  SUBSCRIBED: "subscribed",
} as const;

export const ACTIVITY_TYPES = {
  EMOJI: "emoji",
  IMAGE: "image",
} as const;

const GAME_STATUSES = {
  PLAYING: "PLAYING",
  COMPLETED: "COMPLETED",
  DROPPED: "DROPPED",
  REROLLED: "REROLLED",
} as const;

export const GAME_STATUS_LABELS: Record<string, string> = {
  [GAME_STATUSES.PLAYING]: "В ПРОЦЕССЕ",
  [GAME_STATUSES.COMPLETED]: "ПРОЙДЕНО",
  [GAME_STATUSES.DROPPED]: "ДРОПНУТО",
  [GAME_STATUSES.REROLLED]: "РЕРОЛЬНУТО",
};

export const SUBSCRIPTION_CONTINUE_COST = 1;

export function withRecordMeta<T extends DbTimestamps>(
  row: T,
  collectionName: keyof typeof COLLECTION_IDS,
): T & {
  collectionId: string;
  collectionName: string;
} {
  return {
    ...row,
    collectionId: COLLECTION_IDS[collectionName] ?? collectionName,
    collectionName,
  };
}

export function omitPassword<T extends { passwordHash?: string }>(
  row: T,
): Omit<T, "passwordHash"> {
  const { passwordHash: _, ...rest } = row;
  return rest;
}

export async function getUser(db: Db, id: string) {
  const [row] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, id));
  return row ?? null;
}

export async function getItem(db: Db, id: string) {
  const [row] = await db
    .select()

    .from(schema.items)
    .where(eq(schema.items.id, id));
  return row ?? null;
}
