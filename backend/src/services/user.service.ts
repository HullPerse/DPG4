import * as schema from "../db/schema";
import { removeFirst, getNextDice } from "../lib/game.utils";
import { omitPassword, withRecordMeta } from "../lib/record";
import { Db } from "@/types";
import { ActivityService } from "./activity.service";
import { BaseService } from "./base.service";
import { STATUS_EFFECTS, USER_ACTIONS, ACTIVITY_TYPES } from "../lib/constants";

export class UserService extends BaseService {
  constructor(
    db: Db,
    private activityService: ActivityService,
  ) {
    super(db);
  }

  async getById(userId: string) {
    const row = await this.findById<typeof schema.users.$inferSelect>(schema.users, userId);
    if (!row) return null;
    return withRecordMeta(omitPassword(row), "users");
  }

  async changeStatus(userId: string, status: string, type: "add" | "remove") {
    const user = await this.findById<typeof schema.users.$inferSelect>(schema.users, userId);
    if (!user) return null;

    const current = user.status ?? [];
    const newStatuses =
      type === "remove" ? removeFirst(current, status) : [...current, status];

    await this.updateOne(schema.users, userId, { status: newStatuses }, "users");
    return this.getById(userId);
  }

  async score(userId: string, score: number, trade?: boolean) {
    const user = await this.findById<typeof schema.users.$inferSelect>(schema.users, userId);
    if (!user) return null;

    const userStatuses = user.status ?? [];
    const ephemerality = userStatuses.some((s) => s === STATUS_EFFECTS.EPHEMERALITY);
    const blessings = userStatuses.filter(
      (s) => s === STATUS_EFFECTS.GYPSY_BARON_BLESSING,
    );

    let finalScore = user.money + score;

    if (score > 0 && blessings.length > 0) {
      finalScore = user.money + score * Math.pow(2, blessings.length);
      await this.changeStatus(
        userId,
        STATUS_EFFECTS.GYPSY_BARON_BLESSING,
        "remove",
      );
    }

    if (!trade && score > 0 && ephemerality && Math.random() >= 0.5) {
      await this.changeStatus(userId, STATUS_EFFECTS.EPHEMERALITY, "remove");
      await this.activityService.create({
        image: user.username,
        type: ACTIVITY_TYPES.EMOJI,
        text: `${user.username} не смог получить ${score}`,
      });
      return this.getById(userId);
    }

    await this.updateOne(schema.users, userId, { money: finalScore }, "users");
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

    const finalPlace = () => {
      if (!existingPlaces.includes("1")) return "1";
      if (!existingPlaces.includes("2")) return "2";
      return "3";
    };

    const finalValue = finalPlace();

    const user = await this.findById<typeof schema.users.$inferSelect>(schema.users, userId);
    if (!user) return null;

    await this.activityService.create({
      author: userId,
      image: user.avatar,
      type: ACTIVITY_TYPES.EMOJI,
      text: `${user.username} занял ${finalValue} позицию`,
    });

    await this.updateOne(schema.users, userId, { place: finalValue }, "users");
    return this.getById(userId);
  }

  async changeDice(
    userId: string,
    realTime: number,
    action: typeof USER_ACTIONS.MOVE_POSITIVE | typeof USER_ACTIONS.MOVE_NEGATIVE,
  ) {
    const user = await this.findById<typeof schema.users.$inferSelect>(schema.users, userId);
    if (!user) return null;

    const currentCell = user.position;
    const dice = getNextDice(realTime, currentCell ?? 0, action);

    await this.updateOne(schema.users, userId, { currentDice: dice }, "users");
    return this.getById(userId);
  }
}
