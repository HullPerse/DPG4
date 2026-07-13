import type { PachinkoState, PachinkoDevOverrides, ActivePachinkoGame } from "@/types/gambling";
import type { Db } from "@/types/server";
import UserService from "@/services/user.service";
import EconomyService from "@/services/economy.service";
import { GAMBLING_MIN_BET, GAMBLING_MAX_BET, PACHINKO_SLOT_MULTIPLIERS } from "@/lib/gambling.constants";
import Logger from "@/lib/logger.utils";
import { processPayout, recordHistory } from "@/lib/gambling/payout.utils";
import { loadSession, saveSession, closeSession } from "@/lib/gambling/session.utils";

export default class PachinkoService {
  private logger = new Logger("PACHINKO");

  constructor(private db: Db, private userService: UserService, private economyService: EconomyService) {}

  private idleState(): PachinkoState {
    return { phase: "idle", bid: 0, balance: 0, slotIndex: null, multiplier: 0, payout: 0, net: 0, label: "", tone: "", banned: false, kickAvailable: false };
  }

  private toneFromNet(net: number, bid: number, multiplier: number): "jackpot" | "win" | "lose" | "chance" {
    if (net < 0) return "lose";
    if (multiplier >= 5 || net >= bid * 4) return "jackpot";
    if (net >= bid) return "win";
    return "chance";
  }

  async drop(userId: string, bid: number, ratAmount = 1, devMode?: boolean, _devOverrides?: PachinkoDevOverrides): Promise<PachinkoState> {
    if (!devMode) {
      if (bid < GAMBLING_MIN_BET || bid > GAMBLING_MAX_BET || !Number.isInteger(bid)) throw new Error("Invalid bid");
      if (!Number.isInteger(ratAmount) || ratAmount < 1 || ratAmount > 5) throw new Error("Invalid rat amount");
      const existing = await loadSession(this.db, userId, "pachinko");
      if (existing) throw new Error("Drop already in progress");
    }
    const total = bid * ratAmount;
    const user = devMode ? null : await this.userService.getById(userId);
    if (!devMode && !user) throw new Error("User not found");
    if (!devMode && user!.tickets < total) throw new Error("Insufficient balance");
    if (!devMode && user!.gamblingBanned) throw new Error("Banned from gambling");
    if (!devMode) await this.economyService.deductTickets(userId, total);

    await saveSession(this.db, userId, "pachinko", { userId, bid, ratAmount, droppedAt: Date.now() } as unknown as Record<string, unknown>, total);
    const updated = devMode ? null : await this.userService.getById(userId);
    this.logger.info(`drop bid:${bid} ratAmount:${ratAmount} total:${total}`);
    return { phase: "dropping", bid: total, balance: updated?.tickets ?? 0, slotIndex: null, multiplier: 0, payout: 0, net: 0, label: "", tone: "", banned: false, kickAvailable: false };
  }

  async settle(userId: string, slotIndexes: number[], devMode?: boolean, devOverrides?: PachinkoDevOverrides): Promise<PachinkoState> {
    const session = await loadSession(this.db, userId, "pachinko");
    if (!session) throw new Error("No active drop");
    const game = session.state as unknown as ActivePachinkoGame;
    if (!Array.isArray(slotIndexes) || slotIndexes.length !== game.ratAmount) throw new Error("Invalid slot indexes");

    const totalCost = game.bid * game.ratAmount;
    let totalPayout = 0;
    const usedSlots = devOverrides?.devForceSlots ?? slotIndexes;

    for (const raw of usedSlots) {
      const slot = Math.floor(raw);
      if (!Number.isFinite(slot) || slot < 0 || slot >= PACHINKO_SLOT_MULTIPLIERS.length) throw new Error("Invalid slot");
      totalPayout += Math.floor(game.bid * PACHINKO_SLOT_MULTIPLIERS[slot]);
    }

    const net = totalPayout - totalCost;
    await closeSession(this.db, userId, "pachinko");

    let balance = 0;
    let banned = false;
    if (!devMode) {
      const result = await processPayout(this.db, this.economyService, userId, totalCost, totalPayout);
      balance = result.balance;
      banned = result.banned;
    }

    if (!devMode) {
      await recordHistory(this.db, userId, "pachinko",
        net >= 0 ? `${usedSlots.length} крыс +${net}` : `${usedSlots.length} крыс ${net}`, "",
        totalCost, totalPayout, net,
        { ratAmount: game.ratAmount, perRatBid: game.bid, slots: usedSlots });
    }

    const label = net >= 0 ? `${usedSlots.length} крысы: выигрыш +${net}` : `${usedSlots.length} крысы: проигрыш ${net}`;
    const tone = this.toneFromNet(net, totalCost, 0);
    this.logger.info(`settle rats:${usedSlots.length} totalPayout:${totalPayout} net:${net}`);

    return { phase: "done", bid: totalCost, balance, slotIndex: null, multiplier: 0, payout: totalPayout, net, label, tone, banned, kickAvailable: false };
  }

  async abandon(userId: string): Promise<void> { await closeSession(this.db, userId, "pachinko"); }

  async sync(userId: string): Promise<PachinkoState> {
    const session = await loadSession(this.db, userId, "pachinko");
    if (!session) return this.idleState();
    const game = session.state as unknown as ActivePachinkoGame;
    const user = await this.userService.getById(userId);
    const kickAvailable = Date.now() - game.droppedAt > 15_000;
    return { phase: "dropping", bid: game.bid * game.ratAmount, balance: user?.tickets ?? 0, slotIndex: null, multiplier: 0, payout: 0, net: 0, label: "", tone: "", banned: user?.gamblingBanned ?? false, kickAvailable };
  }
}