import { desc, eq } from "drizzle-orm";
import * as schema from "@/db/schema.db";
import { nowIso } from "@/lib/index.utils";
import { broadcast } from "@/lib/websocket.utils";
import type { Db } from "@/types/server";
import ActivityService from "./activity.service";

const STATUSES: Record<string, string> = {
  PLAYING: "В ПРОЦЕССЕ",
  COMPLETED: "ПРОЙДЕНО",
  DROPPED: "ДРОПНУТО",
  REROLLED: "РЕРОЛЬНУТО",
};

export default class GameService {
  constructor(private db: Db, private activityService: ActivityService) {}

  async getLastForUser(userId: string) {
    const [row] = await this.db
      .select()
      .from(schema.games)
      .where(eq(schema.games.userId, userId))
      .orderBy(desc(schema.games.created))
      .limit(1);
    return row ?? null;
  }

  async changeStatus(gameId: string, status: string, time: number, score: number) {
    const [game] = await this.db
      .select()
      .from(schema.games)
      .where(eq(schema.games.id, gameId));
    if (!game) return null;

    const newTime = status === "COMPLETED"
      ? { ...(game.playtime as object), user: time }
      : game.playtime;

    await this.db
      .update(schema.games)
      .set({ status, playtime: newTime, score, updated: nowIso() })
      .where(eq(schema.games.id, gameId));

    const gameUser = game.user as { id: string; username: string };
    const gameData = game.data as { name: string; capsuleImage?: string };

    await this.activityService.create({
      author: gameUser.id,
      image: gameData.capsuleImage ?? "",
      type: "image",
      text: `${gameUser.username} сменил статус игры ${gameData.name} на ${STATUSES[status] ?? status}`,
    });

    broadcast("games", "update", gameId);
    return game;
  }

  async rerollUserLastGame(userId: string) {
    const game = await this.getLastForUser(userId);
    if (!game) return null;
    await this.changeStatus(game.id, "REROLLED", Number((game.data as { time?: number })?.time ?? 0), Number(game.score ?? 0));
    return game;
  }

  async dropUserPlayingGame(userId: string) {
    const game = await this.getLastForUser(userId);
    if (!game || game.status !== "PLAYING") return null;
    await this.changeStatus(game.id, "DROPPED", Number((game.data as { time?: number })?.time ?? 0), Number(game.score ?? 0));
    return game;
  }
}