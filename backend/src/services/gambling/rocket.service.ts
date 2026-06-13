import { eq } from "drizzle-orm";
import * as schema from "../../db/schema";
import { logger } from "../../lib/logger";
import { nowIso } from "../../lib/dates";
import { newId } from "../../lib/ids";
import type { ActiveRocketGame, RocketState } from "@/types/gambling";
import type { Db } from "@/types";
import { UserService } from "@/services/user.service";
import {
  GAMBLING_BAN_THRESHOLD,
  GAMBLING_MIN_BET,
  GAMBLING_MAX_BET,
  ROCKET_START_MULT,
} from "../../lib/gambling.constants";
import { deductTickets, addTickets } from "../../lib/ticket.helpers";

export class RocketService {
  constructor(
    private db: Db,
    private userService: UserService,
  ) {}

  private activeGames = new Map<string, ActiveRocketGame>();
  private lastEndedGames = new Map<string, RocketState>();
  private crashHistory: { crashPoint: number; timestamp: number }[] = [];
  private MAX_HISTORY = 50;
  private HOUSE_EDGE = 0.9;

  private generateCrashPoint(bid: number): number {
    const e = Math.random();
    const edge = Math.max(0.8, this.HOUSE_EDGE - (bid - 1) * 0.01);
    return Math.max(1, Math.floor((edge / (1 - e)) * 100) / 100);
  }

  private computeMultiplier(elapsedMs: number): number {
    const t = elapsedMs / 1000;
    return Math.max(
      0,
      Math.floor((ROCKET_START_MULT + 0.08 * t + 0.02 * t * t) * 100) / 100,
    );
  }

  private idleState(): RocketState {
    return {
      phase: "idle",
      multiplier: 0,
      crashPoint: 0,
      bid: 0,
      balance: 0,
      net: 0,
      label: "",
      tone: "",
      banned: false,
    };
  }

  private async processCrash(
    userId: string,
    game: ActiveRocketGame,
  ): Promise<RocketState> {
    this.crashHistory.push({
      crashPoint: game.crashPoint,
      timestamp: Date.now(),
    });
    if (this.crashHistory.length > this.MAX_HISTORY) this.crashHistory.shift();

    await deductTickets(this.db, userId, game.bid);

    const user = await this.userService.getById(userId);
    this.activeGames.delete(userId);

    if (user) {
      await this.db.insert(schema.history).values({
        id: newId(),
        userId,
        owner: { id: user.id, username: user.username },
        type: "rocket",
        label: `Крах на ${game.crashPoint.toFixed(2)}x`,
        image: "",
        bid: game.bid,
        payout: 0,
        net: -game.bid,
        data: { crashPoint: game.crashPoint, phase: "crashed" },
        created: nowIso(),
      });
    }

    const label = `Крах на ${game.crashPoint.toFixed(2)}x - проигрыш -${game.bid}`;

    logger.info(
      "system",
      `rocket crash user:${userId} bid:${game.bid} crash:${game.crashPoint}x`,
    );

    const state: RocketState = {
      phase: "crashed",
      multiplier: game.crashPoint,
      crashPoint: game.crashPoint,
      bid: game.bid,
      balance: user?.tickets ?? 0,
      net: -game.bid,
      label,
      tone: "lose",
      banned: user?.gamblingBanned ?? false,
    };
    this.lastEndedGames.set(userId, state);
    return state;
  }

  async launch(userId: string, bid: number): Promise<RocketState> {
    if (
      bid < GAMBLING_MIN_BET ||
      bid > GAMBLING_MAX_BET ||
      !Number.isInteger(bid)
    )
      throw new Error("Invalid bid");

    if (this.activeGames.has(userId))
      throw new Error("Game already in progress");

    this.lastEndedGames.delete(userId);

    const user = await this.userService.getById(userId);
    if (!user) throw new Error("User not found");
    if (user.tickets < bid) throw new Error("Insufficient balance");
    if (user.gamblingBanned) throw new Error("Banned from gambling");

    const crashPoint = this.generateCrashPoint(bid);
    const now = Date.now();

    this.activeGames.set(userId, {
      userId,
      bid,
      crashPoint,
      launchedAt: now,
      cashedOut: false,
      cashoutMultiplier: null,
    });

    logger.info(
      user.username,
      "launched rocket",
      `bid:${bid}`,
      `crash:${crashPoint}x`,
    );

    return {
      phase: "launching",
      multiplier: 1,
      crashPoint,
      bid,
      balance: user.tickets,
      net: 0,
      label: "",
      tone: "",
      banned: false,
    };
  }

  async cashout(userId: string): Promise<RocketState> {
    const game = this.activeGames.get(userId);
    if (!game) throw new Error("No active game");
    if (game.cashedOut) throw new Error("Already cashed out");

    const elapsed = Date.now() - game.launchedAt;
    const currentMultiplier = this.computeMultiplier(elapsed);

    if (currentMultiplier >= game.crashPoint) {
      return this.processCrash(userId, game);
    }

    game.cashedOut = true;
    game.cashoutMultiplier = currentMultiplier;

    const payout = Math.floor(game.bid * currentMultiplier);
    const net = payout - game.bid;

    await deductTickets(this.db, userId, game.bid);
    await addTickets(this.db, userId, payout);

    const user = await this.userService.getById(userId);
    let gamblingWinnings = (user?.gamblingWinnings ?? 0) + Math.max(0, net);
    let gamblingBanned = user?.gamblingBanned ?? false;
    if (gamblingWinnings >= GAMBLING_BAN_THRESHOLD && !gamblingBanned) {
      gamblingBanned = true;
    }

    await this.db
      .update(schema.users)
      .set({ gamblingWinnings, gamblingBanned, updated: nowIso() })
      .where(eq(schema.users.id, userId));

    const label = `Результат ${currentMultiplier.toFixed(2)}x - выигрыш +${net}`;
    const tone: "jackpot" | "win" | "chance" =
      net >= game.bid * 5 ? "jackpot" : net >= game.bid * 2 ? "win" : "chance";

    this.activeGames.delete(userId);

    if (user) {
      await this.db.insert(schema.history).values({
        id: newId(),
        userId,
        owner: { id: user.id, username: user.username },
        type: "rocket",
        label: `Выигрыш ${currentMultiplier.toFixed(2)}x`,
        image: "",
        bid: game.bid,
        payout,
        net,
        data: {
          crashPoint: game.crashPoint,
          cashoutMultiplier: currentMultiplier,
          phase: "cashed",
        },
        created: nowIso(),
      });
    }

    logger.info(
      "system",
      `rocket cashout user:${userId} mult:${currentMultiplier}x net:${net}`,
    );

    const state: RocketState = {
      phase: "cashed",
      multiplier: currentMultiplier,
      crashPoint: game.crashPoint,
      bid: game.bid,
      balance: user?.tickets ?? 0,
      net,
      label,
      tone,
      banned: gamblingBanned,
    };
    this.lastEndedGames.set(userId, state);
    return state;
  }

  async poll(userId: string): Promise<RocketState> {
    const game = this.activeGames.get(userId);
    if (!game) {
      const ended = this.lastEndedGames.get(userId);
      if (ended) return ended;
      return this.idleState();
    }

    const elapsed = Date.now() - game.launchedAt;
    const currentMultiplier = this.computeMultiplier(elapsed);

    if (currentMultiplier >= game.crashPoint) {
      return this.processCrash(userId, game);
    }

    return {
      phase: "flying",
      multiplier: currentMultiplier,
      crashPoint: game.crashPoint,
      bid: game.bid,
      balance: 0,
      net: 0,
      label: "",
      tone: "",
      banned: false,
    };
  }

  abandon(userId: string): void {
    this.activeGames.delete(userId);
    this.lastEndedGames.delete(userId);
  }

  dismiss(userId: string): void {
    this.lastEndedGames.delete(userId);
  }

  getHistory(): { crashPoint: number; timestamp: number }[] {
    return [...this.crashHistory];
  }
}
