import { eq } from "drizzle-orm";
import * as schema from "../../db/schema";
import { logger } from "../../lib/logger";
import { nowIso } from "../../lib/dates";
import { newId } from "../../lib/ids";
import type { Db } from "@/types";
import type { PachinkoState } from "@/types/gambling";
import { UserService } from "@/services/user.service";
import {
  GAMBLING_BAN_THRESHOLD,
  GAMBLING_MIN_BET,
  GAMBLING_MAX_BET,
} from "../../lib/gambling.constants";

export const PACHINKO_SLOT_MULTIPLIERS = [
  5, 3, 2, 1.5, 1, 0.5, 0.5, 0.5, 1, 1.5, 2, 3, 5,
] as const;

interface ActivePachinkoGame {
  userId: string;
  bid: number;
  ratAmount: number;
  droppedAt: number;
}

export class PachinkoService {
  constructor(
    private db: Db,
    private userService: UserService,
  ) {}

  private activeGames = new Map<string, ActivePachinkoGame>();

  private idleState(): PachinkoState {
    return {
      phase: "idle",
      bid: 0,
      balance: 0,
      slotIndex: null,
      multiplier: 0,
      payout: 0,
      net: 0,
      label: "",
      tone: "",
      banned: false,
      kickAvailable: false,
    };
  }

  private toneFromNet(
    net: number,
    bid: number,
    multiplier: number,
  ): "jackpot" | "win" | "lose" | "chance" {
    if (net < 0) return "lose";
    if (multiplier >= 5 || net >= bid * 4) return "jackpot";
    if (net >= bid) return "win";
    return "chance";
  }

  async drop(userId: string, bid: number, ratAmount = 1): Promise<PachinkoState> {
    if (
      bid < GAMBLING_MIN_BET ||
      bid > GAMBLING_MAX_BET ||
      !Number.isInteger(bid)
    )
      throw new Error("Invalid bid");

    if (!Number.isInteger(ratAmount) || ratAmount < 1 || ratAmount > 5)
      throw new Error("Invalid rat amount");

    if (this.activeGames.has(userId))
      throw new Error("Drop already in progress");

    const total = bid * ratAmount;
    const user = await this.userService.getById(userId);
    if (!user) throw new Error("User not found");
    if (user.money < total) throw new Error("Insufficient balance");
    if (user.gamblingBanned) throw new Error("Banned from gambling");

    await this.userService.score(userId, -total);
    this.activeGames.set(userId, { userId, bid, ratAmount, droppedAt: Date.now() });

    const updated = await this.userService.getById(userId);
    logger.info(user.username, "pachinko drop", `bid:${bid} ratAmount:${ratAmount} total:${total}`);

    return {
      phase: "dropping",
      bid: total,
      balance: updated?.money ?? 0,
      slotIndex: null,
      multiplier: 0,
      payout: 0,
      net: 0,
      label: "",
      tone: "",
      banned: false,
      kickAvailable: false,
    };
  }

  async settle(userId: string, slotIndexes: number[]): Promise<PachinkoState> {
    const game = this.activeGames.get(userId);
    if (!game) throw new Error("No active drop");

    if (!Array.isArray(slotIndexes) || slotIndexes.length !== game.ratAmount) {
      throw new Error("Invalid slot indexes");
    }

    const totalCost = game.bid * game.ratAmount;
    let totalPayout = 0;

    for (const raw of slotIndexes) {
      const slot = Math.floor(raw);
      if (
        !Number.isFinite(slot) ||
        slot < 0 ||
        slot >= PACHINKO_SLOT_MULTIPLIERS.length
      ) {
        throw new Error("Invalid slot");
      }
      const mult = PACHINKO_SLOT_MULTIPLIERS[slot];
      totalPayout += Math.floor(game.bid * mult);
    }

    const net = totalPayout - totalCost;

    if (totalPayout > 0) {
      await this.userService.score(userId, totalPayout);
    }

    const user = await this.userService.getById(userId);
    let gamblingWinnings = (user?.gamblingWinnings ?? 0) + Math.max(0, net);
    let gamblingBanned = user?.gamblingBanned ?? false;

    if (
      totalPayout > 0 &&
      gamblingWinnings >= GAMBLING_BAN_THRESHOLD &&
      !gamblingBanned
    ) {
      gamblingBanned = true;
    }

    await this.db
      .update(schema.users)
      .set({ gamblingWinnings, gamblingBanned, updated: nowIso() })
      .where(eq(schema.users.id, userId));

    this.activeGames.delete(userId);

    if (user) {
      await this.db.insert(schema.history).values({
        id: newId(),
        userId,
        owner: { id: user.id, username: user.username },
        type: "pachinko",
        label:
          net >= 0
            ? `${slotIndexes.length} крыс +${net}`
            : `${slotIndexes.length} крыс ${net}`,
        image: "",
        bid: totalCost,
        payout: totalPayout,
        net,
        data: { ratAmount: game.ratAmount, perRatBid: game.bid, slots: slotIndexes },
        created: nowIso(),
      });
    }

    const label =
      net >= 0
        ? `${slotIndexes.length} крысы: выигрыш +${net}`
        : `${slotIndexes.length} крысы: проигрыш ${net}`;

    const tone = this.toneFromNet(net, totalCost, 0);

    logger.info(
      "system",
      `pachinko settle user:${userId} rats:${slotIndexes.length} totalPayout:${totalPayout} net:${net}`,
    );

    const updated = await this.userService.getById(userId);

    return {
      phase: "done",
      bid: totalCost,
      balance: updated?.money ?? 0,
      slotIndex: null,
      multiplier: 0,
      payout: totalPayout,
      net,
      label,
      tone,
      banned: gamblingBanned,
      kickAvailable: false,
    };
  }

  abandon(userId: string): void {
    this.activeGames.delete(userId);
  }

  async sync(userId: string): Promise<PachinkoState> {
    const game = this.activeGames.get(userId);
    if (!game) return this.idleState();

    const user = await this.userService.getById(userId);
    const kickAvailable = Date.now() - game.droppedAt > 15_000;

    return {
      phase: "dropping",
      bid: game.bid * game.ratAmount,
      balance: user?.money ?? 0,
      slotIndex: null,
      multiplier: 0,
      payout: 0,
      net: 0,
      label: "",
      tone: "",
      banned: user?.gamblingBanned ?? false,
      kickAvailable,
    };
  }
}
