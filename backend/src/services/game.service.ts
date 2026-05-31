import { desc, eq } from "drizzle-orm";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import * as schema from "../db/schema";
import { nowIso } from "../lib/dates";
import { broadcast } from "../lib/ws";
import { createActivity } from "./activity.service";

type Db = BunSQLiteDatabase<typeof schema>;

const STATUSES: Record<string, string> = {
  PLAYING: "В ПРОЦЕССЕ",
  COMPLETED: "ПРОЙДЕНО",
  DROPPED: "ДРОПНУТО",
  REROLLED: "РЕРОЛЬНУТО",
};

export async function getLastGameForUser(db: Db, userId: string) {
  const [row] = await db
    .select()
    .from(schema.games)
    .where(eq(schema.games.userId, userId))
    .orderBy(desc(schema.games.created))
    .limit(1);
  return row ?? null;
}

export async function changeGameStatus(
  db: Db,
  gameId: string,
  status: string,
  time: number,
  score: number,
) {
  const [game] = await db
    .select()
    .from(schema.games)
    .where(eq(schema.games.id, gameId));
  if (!game) return null;

  const newTime =
    status === "COMPLETED"
      ? { ...(game.playtime as object), user: time }
      : game.playtime;

  await db
    .update(schema.games)
    .set({
      status,
      playtime: newTime,
      score,
      updated: nowIso(),
    })
    .where(eq(schema.games.id, gameId));

  const gameUser = game.user as { id: string; username: string };
  const gameData = game.data as { name: string; capsuleImage?: string };

  await createActivity(db, {
    author: gameUser.id,
    image: gameData.capsuleImage ?? "",
    type: "image",
    text: `${gameUser.username} сменил статус игры ${gameData.name} на ${STATUSES[status] ?? status}`,
  });

  broadcast("games", "update", gameId);
  return game;
}

export async function rerollUserLastGame(db: Db, userId: string) {
  const game = await getLastGameForUser(db, userId);
  if (!game) return null;
  await changeGameStatus(
    db,
    game.id,
    "REROLLED",
    Number((game.data as { time?: number })?.time ?? 0),
    Number(game.score ?? 0),
  );
  return game;
}

export async function dropUserPlayingGame(db: Db, userId: string) {
  const game = await getLastGameForUser(db, userId);
  if (!game || game.status !== "PLAYING") return null;
  await changeGameStatus(
    db,
    game.id,
    "DROPPED",
    Number((game.data as { time?: number })?.time ?? 0),
    Number(game.score ?? 0),
  );
  return game;
}
