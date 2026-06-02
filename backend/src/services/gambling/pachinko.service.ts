import { eq } from "drizzle-orm";
import * as schema from "../../db/schema";
import { logger } from "../../lib/logger";
import { nowIso } from "../../lib/dates";
import type { Db } from "@/types";
import type { PachinkoState } from "@/types/gambling";
import { UserService } from "../user.service";

export const PACHINKO_SLOT_MULTIPLIERS = [
  5, 3, 2, 1.5, 1, 0.5, 0.5, 0.5, 1, 1.5, 2, 3, 5,
] as const;

interface ActivePachinkoGame {
  userId: string;
  bid: number;
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

  async drop(userId: string, bid: number): Promise<PachinkoState> {
    if (bid < 1 || bid > 10 || !Number.isInteger(bid))
      throw new Error("Invalid bid");

    if (this.activeGames.has(userId)) throw new Error("Drop already in progress");

    const user = await this.userService.getById(userId);
    if (!user) throw new Error("User not found");
    if (user.money < bid) throw new Error("Insufficient balance");
    if (user.gamblingBanned) throw new Error("Banned from gambling");

    await this.userService.score(userId, -bid);
    this.activeGames.set(userId, { userId, bid, droppedAt: Date.now() });

    const updated = await this.userService.getById(userId);
    logger.info(user.username, "pachinko drop", `bid:${bid}`);

    return {
      phase: "dropping",
      bid,
      balance: updated?.money ?? 0,
      slotIndex: null,
      multiplier: 0,
      payout: 0,
      net: 0,
      label: "",
      tone: "",
      banned: false,
    };
  }

  async settle(userId: string, slotIndex: number): Promise<PachinkoState> {
    const slot = Math.floor(slotIndex);
    const game = this.activeGames.get(userId);
    if (!game) throw new Error("No active drop");

    if (
      !Number.isFinite(slot) ||
      slot < 0 ||
      slot >= PACHINKO_SLOT_MULTIPLIERS.length
    ) {
      throw new Error("Invalid slot");
    }

    const multiplier = PACHINKO_SLOT_MULTIPLIERS[slot];
    const payout = Math.floor(game.bid * multiplier);
    const net = payout - game.bid;

    if (payout > 0) {
      await this.userService.score(userId, payout);
    }

    const user = await this.userService.getById(userId);
    let gamblingWinnings = (user?.gamblingWinnings ?? 0) + Math.max(0, payout);
    let gamblingBanned = user?.gamblingBanned ?? false;

    if (payout > 0 && gamblingWinnings >= 30 && !gamblingBanned) {
      gamblingBanned = true;
    }

    await this.db
      .update(schema.users)
      .set({ gamblingWinnings, gamblingBanned, updated: nowIso() })
      .where(eq(schema.users.id, userId));

    this.activeGames.delete(userId);

    const label =
      net >= 0
        ? `Слот ${multiplier}x - выигрыш +${net}`
        : `Слот ${multiplier}x - проигрыш ${net}`;

    const tone = this.toneFromNet(net, game.bid, multiplier);

    logger.info(
      "system",
      `pachinko settle user:${userId} slot:${slot} mult:${multiplier}x net:${net}`,
    );

    const updated = await this.userService.getById(userId);

    return {
      phase: "done",
      bid: game.bid,
      balance: updated?.money ?? 0,
      slotIndex: slot,
      multiplier,
      payout,
      net,
      label,
      tone,
      banned: gamblingBanned,
    };
  }

  abandon(userId: string): void {
    this.activeGames.delete(userId);
  }

  async sync(userId: string): Promise<PachinkoState> {
    const game = this.activeGames.get(userId);
    if (!game) return this.idleState();

    const user = await this.userService.getById(userId);

    return {
      phase: "dropping",
      bid: game.bid,
      balance: user?.money ?? 0,
      slotIndex: null,
      multiplier: 0,
      payout: 0,
      net: 0,
      label: "",
      tone: "",
      banned: user?.gamblingBanned ?? false,
    };
  }
}
