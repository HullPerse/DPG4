import { eq } from "drizzle-orm";
import * as schema from "../db/schema";
import { removeFirst, getNextDice } from "../lib/game.utils";
import { broadcast } from "../lib/ws";
import { omitPassword, withRecordMeta } from "../lib/record";
import { nowIso } from "../lib/dates";
import { Db } from "@/types";
import { ActivityService } from "./activity.service";

export class UserService {
  constructor(
    private db: Db,
    private activityService: ActivityService,
  ) {}

  async getById(userId: string) {
    const [row] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId));
    if (!row) return null;
    return withRecordMeta(omitPassword(row), "users");
  }

  async changeStatus(
    userId: string,
    status: string,
    type: "add" | "remove",
  ) {
    const user = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .then((res) => res[0]);
    if (!user) return null;

    const current = user.status ?? [];
    const newStatuses =
      type === "remove" ? removeFirst(current, status) : [...current, status];

    await this.db
      .update(schema.users)
      .set({ status: newStatuses, updated: nowIso() })
      .where(eq(schema.users.id, userId));

    broadcast("users", "update", userId);
    return this.getById(userId);
  }

  async score(userId: string, score: number, trade?: boolean) {
    const user = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .then((r) => r[0]);
    if (!user) return null;

    const userStatuses = user.status ?? [];
    const ephemerality = userStatuses.some((s) => s === "Эфемерность");
    const blessings = userStatuses.filter(
      (s) => s === "Благословление цыганского барона",
    );

    let finalScore = user.money + score;

    if (score > 0 && blessings.length > 0) {
      finalScore = user.money + score * Math.pow(2, blessings.length);
      await this.changeStatus(userId, "Благословление цыганского барона", "remove");
    }

    if (!trade && score > 0 && ephemerality && Math.random() >= 0.5) {
      await this.changeStatus(userId, "Эфемерность", "remove");
      await this.activityService.create({
        image: user.username,
        type: "emoji",
        text: `${user.username} не смог получить ${score}`,
      });
      broadcast("users", "update", userId);
      return this.getById(userId);
    }

    await this.db
      .update(schema.users)
      .set({ money: finalScore, updated: nowIso() })
      .where(eq(schema.users.id, userId));

    broadcast("users", "update", userId);
    return this.getById(userId);
  }

  async updatePlace(userId: string) {
    const all = await this.db
      .select({ place: schema.users.place })
      .from(schema.users);
    const existingPlaces = all.map((p) => p.place);
    if (
      existingPlaces.includes("1") &&
      existingPlaces.includes("2") &&
      existingPlaces.includes("3")
    ) {
      return null;
    }

    const finalPlace = !existingPlaces.includes("1")
      ? "1"
      : !existingPlaces.includes("2")
        ? "2"
        : "3";

    const user = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .then((r) => r[0]);
    if (!user) return null;

    await this.activityService.create({
      author: userId,
      image: user.avatar,
      type: "emoji",
      text: `${user.username} занял ${finalPlace} позицию`,
    });

    await this.db
      .update(schema.users)
      .set({ place: finalPlace, updated: nowIso() })
      .where(eq(schema.users.id, userId));

    broadcast("users", "update", userId);
    return this.getById(userId);
  }

  async changeDice(
    userId: string,
    realTime: number,
    action: "MOVE_POSITIVE" | "MOVE_NEGATIVE",
  ) {
    const user = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .then((r) => r[0]);
    if (!user) return null;

    const currentCell = user.position;
    const dice = getNextDice(realTime, currentCell ?? 0, action);

    await this.db
      .update(schema.users)
      .set({ currentDice: dice, updated: nowIso() })
      .where(eq(schema.users.id, userId));

    broadcast("users", "update", userId);
    return this.getById(userId);
  }
}
