import { eq, inArray } from "drizzle-orm";
import * as schema from "@/db/schema.db";
import type { ActiveRocketGame, RocketState, RocketDevOverrides } from "@/types/gambling";
import type { Db } from "@/types/server";
import UserService from "@/services/user.service";
import EconomyService from "@/services/economy.service";
import { GAMBLING_MIN_BET, GAMBLING_MAX_BET, ROCKET_START_MULT } from "@/lib/gambling.constants";
import { nowIso } from "@/lib/index.utils";
import Logger from "@/lib/logger.utils";
import { processPayout, recordHistory } from "@/lib/gambling/payout.utils";
import { loadSession, saveSession, closeSession } from "@/lib/gambling/session.utils";

export default class RocketService {
  private logger = new Logger("ROCKET");

  constructor(private db: Db, private userService: UserService, private economyService: EconomyService) {}

  private generateCrashPoint(bid: number): number {
    const LAMBDA = 2 + (bid - 1) * 0.05;
    const e = Math.random();
    const crashPoint = 1 - Math.log(1 - e) / LAMBDA;
    return Math.max(1, Math.floor(crashPoint * 100) / 100);
  }

  private computeMultiplier(elapsedMs: number): number {
    const t = elapsedMs / 1000;
    return Math.max(0, Math.floor((ROCKET_START_MULT + 0.08 * t + 0.02 * t * t) * 100) / 100);
  }

  private idleState(): RocketState {
    return { phase: "idle", multiplier: 0, crashPoint: 0, bid: 0, balance: 0, net: 0, label: "", tone: "", banned: false };
  }

  private async processCrash(userId: string, game: ActiveRocketGame, devMode?: boolean): Promise<RocketState> {
    if (!devMode) {
      await this.db.insert(schema.rocketCrashHistory).values({
        crashPoint: Math.round(game.crashPoint * 100),
        created: nowIso(),
      });
      const rows = await this.db
        .select({ id: schema.rocketCrashHistory.id })
        .from(schema.rocketCrashHistory)
        .orderBy(schema.rocketCrashHistory.created)
        .offset(50)
        .limit(1000);
      if (rows.length > 0) {
        const ids = rows.map((r) => r.id);
        await this.db.delete(schema.rocketCrashHistory).where(inArray(schema.rocketCrashHistory.id, ids));
      }
    }

    let balance = 0;
    let banned = false;
    if (!devMode) {
      await this.economyService.deductTickets(userId, game.bid);
      const result = await processPayout(this.db, this.economyService, userId, game.bid, 0);
      balance = result.balance;
      banned = result.banned;
    }

    await closeSession(this.db, userId, "rocket");

    if (!devMode) {
      await recordHistory(this.db, userId, "rocket", `Крах на ${game.crashPoint.toFixed(2)}x`, "",
        game.bid, 0, -game.bid,
        { crashPoint: game.crashPoint, phase: "crashed" });
    }

    const label = `Крах на ${game.crashPoint.toFixed(2)}x - проигрыш -${game.bid}`;
    this.logger.info(`rocket crash user:${userId} bid:${game.bid} crash:${game.crashPoint}x`);

    return { phase: "crashed", multiplier: game.crashPoint, crashPoint: game.crashPoint, bid: game.bid, balance, net: -game.bid, label, tone: "lose", banned };
  }

  async launch(userId: string, bid: number, devMode?: boolean, devOverrides?: RocketDevOverrides): Promise<RocketState> {
    if (!devMode) {
      if (bid < GAMBLING_MIN_BET || bid > GAMBLING_MAX_BET || !Number.isInteger(bid)) throw new Error("Invalid bid");
      const existing = await loadSession(this.db, userId, "rocket");
      if (existing) throw new Error("Game already in progress");
    }
    const user = devMode ? null : await this.userService.getById(userId);
    if (!devMode && !user) throw new Error("User not found");
    if (!devMode && user!.tickets < bid) throw new Error("Insufficient balance");
    if (!devMode && user!.gamblingBanned) throw new Error("Banned from gambling");

    const crashPoint = devOverrides?.devForceCrashPoint ?? this.generateCrashPoint(bid);
    const now = Date.now();
    const game: ActiveRocketGame = { userId, bid, crashPoint, launchedAt: now, cashedOut: false, cashoutMultiplier: null };
    await saveSession(this.db, userId, "rocket", game as unknown as Record<string, unknown>, bid);
    this.logger.info(`launched rocket bid:${bid} crash:${crashPoint}x`);

    return { phase: "launching", multiplier: 1, crashPoint: devOverrides?.devShowCrashPoint ? crashPoint : crashPoint, bid, balance: user?.tickets ?? 0, net: 0, label: "", tone: "", banned: false };
  }

  async cashout(userId: string, devMode?: boolean): Promise<RocketState> {
    const session = await loadSession(this.db, userId, "rocket");
    if (!session) throw new Error("No active game");
    const game = session.state as unknown as ActiveRocketGame;
    if (game.cashedOut) throw new Error("Already cashed out");

    const elapsed = Date.now() - game.launchedAt;
    const currentMultiplier = this.computeMultiplier(elapsed);
    if (currentMultiplier >= game.crashPoint) return this.processCrash(userId, game, devMode);

    game.cashedOut = true;
    game.cashoutMultiplier = currentMultiplier;
    const payout = Math.floor(game.bid * currentMultiplier);
    const net = payout - game.bid;

    let balance = 0;
    let banned = false;
    if (!devMode) {
      await this.economyService.deductTickets(userId, game.bid);
      const result = await processPayout(this.db, this.economyService, userId, game.bid, payout);
      balance = result.balance;
      banned = result.banned;
    }

    const label = `Результат ${currentMultiplier.toFixed(2)}x - выигрыш +${net}`;
    const tone: "jackpot" | "win" | "chance" = net >= game.bid * 5 ? "jackpot" : net >= game.bid * 2 ? "win" : "chance";
    await closeSession(this.db, userId, "rocket");

    if (!devMode) {
      await recordHistory(this.db, userId, "rocket", `Выигрыш ${currentMultiplier.toFixed(2)}x`, "",
        game.bid, payout, net,
        { crashPoint: game.crashPoint, cashoutMultiplier: currentMultiplier, phase: "cashed" });
    }

    this.logger.info(`rocket cashout mult:${currentMultiplier}x net:${net}`);
    return { phase: "cashed", multiplier: currentMultiplier, crashPoint: game.crashPoint, bid: game.bid, balance, net, label, tone, banned };
  }

  async poll(userId: string, devMode?: boolean): Promise<RocketState> {
    const session = await loadSession(this.db, userId, "rocket");
    if (!session) return this.idleState();
    const game = session.state as unknown as ActiveRocketGame;
    const elapsed = Date.now() - game.launchedAt;
    const currentMultiplier = this.computeMultiplier(elapsed);
    if (currentMultiplier >= game.crashPoint) return this.processCrash(userId, game, devMode);
    return { phase: "flying", multiplier: currentMultiplier, crashPoint: game.crashPoint, bid: game.bid, balance: 0, net: 0, label: "", tone: "", banned: false };
  }

  async abandon(userId: string): Promise<void> { await closeSession(this.db, userId, "rocket"); }

  async getHistory(): Promise<{ crashPoint: number; created: string }[]> {
    const rows = await this.db
      .select({ crashPoint: schema.rocketCrashHistory.crashPoint, created: schema.rocketCrashHistory.created })
      .from(schema.rocketCrashHistory)
      .orderBy(schema.rocketCrashHistory.created)
      .limit(50);
    return rows.map((r) => ({ crashPoint: r.crashPoint / 100, created: r.created }));
  }
}
