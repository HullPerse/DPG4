import { eq } from "drizzle-orm";
import * as schema from "../../db/schema";
import { logger } from "../../lib/logger";
import { nowIso } from "../../lib/dates";
import { newId } from "../../lib/ids";
import type { WheelResult } from "@/types/gambling";
import type { Db } from "@/types";
import { UserService } from "@/services/user.service";
import {
  GAMBLING_BAN_THRESHOLD,
  GAMBLING_MIN_BET,
  GAMBLING_MAX_BET,
} from "../../lib/gambling.constants";

const WHEEL_SEGMENTS = [
  { mult: 0.5 },
  { mult: 1 },
  { mult: 0.5 },
  { mult: 2 },
  { mult: 0.5 },
  { mult: 1 },
  { mult: 0.5 },
  { mult: 3 },
  { mult: 0.5 },
  { mult: 1 },
  { mult: 0.5 },
  { mult: 5 },
] as const;

export class WheelService {
  constructor(
    private db: Db,
    private userService: UserService,
  ) {}

  async spin(userId: string, bid: number): Promise<WheelResult> {
    if (
      bid < GAMBLING_MIN_BET ||
      bid > GAMBLING_MAX_BET ||
      !Number.isInteger(bid)
    )
      throw new Error("Invalid bid");

    const user = await this.userService.getById(userId);
    if (!user) throw new Error("User not found");
    if (user.money < bid) throw new Error("Insufficient balance");
    if (user.gamblingBanned) throw new Error("Banned from gambling");

    await this.userService.score(userId, -bid);

    const segment = Math.floor(Math.random() * WHEEL_SEGMENTS.length);
    const multiplier = WHEEL_SEGMENTS[segment].mult;
    const payout = Math.floor(bid * multiplier);
    const net = payout - bid;

    if (payout > 0) {
      await this.userService.score(userId, payout);
    }

    const freshUser = await this.userService.getById(userId);
    let gamblingWinnings = (freshUser?.gamblingWinnings ?? 0) + Math.max(0, net);
    let gamblingBanned = freshUser?.gamblingBanned ?? false;
    if (gamblingWinnings >= GAMBLING_BAN_THRESHOLD && !gamblingBanned) {
      gamblingBanned = true;
    }

    await this.db
      .update(schema.users)
      .set({ gamblingWinnings, gamblingBanned, updated: nowIso() })
      .where(eq(schema.users.id, userId));

    const label =
      net > 0
        ? `Выигрыш ${multiplier}x +${net}`
        : net < 0
          ? `Проигрыш ${multiplier}x ${net}`
          : `Возврат ${multiplier}x`;

    const tone: "jackpot" | "win" | "lose" | "chance" =
      net <= 0
        ? "lose"
        : net >= bid * 5
          ? "jackpot"
          : net >= bid * 2
            ? "win"
            : "chance";

    if (freshUser) {
      await this.db.insert(schema.history).values({
        id: newId(),
        userId,
        owner: { id: freshUser.id, username: freshUser.username },
        type: "wheel",
        label,
        image: "",
        bid,
        payout,
        net,
        data: { segment, multiplier, phase: "done" },
        created: nowIso(),
      });
    }

    logger.info(
      "system",
      `wheel spin user:${userId} segment:${segment} mult:${multiplier}x net:${net}`,
    );

    return {
      segment,
      multiplier,
      payout,
      net,
      label,
      tone,
      balance: freshUser?.money ?? 0,
      banned: gamblingBanned,
    };
  }
}
