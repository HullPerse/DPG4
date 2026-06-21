import { eq } from "drizzle-orm";
import * as schema from "@/db/schema.db";
import { nowIso, newId } from "@/lib/index.utils";
import { PachinkoState, PachinkoDevOverrides, ActivePachinkoGame } from "@/types/gambling";
import { Db } from "@/types/server";
import UserService from "@/services/user.service";
import EconomyService from "@/services/economy.service";
import { GAMBLING_BAN_THRESHOLD, GAMBLING_MIN_BET, GAMBLING_MAX_BET, PACHINKO_SLOT_MULTIPLIERS } from "@/lib/gambling.constants";
import Logger from "@/lib/logger.utils";

export default class PachinkoService {
  private activeGames = new Map<string, ActivePachinkoGame>();
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
      if (this.activeGames.has(userId)) throw new Error("Drop already in progress");
    }
    const total = bid * ratAmount;
    const user = devMode ? null : await this.userService.getById(userId);
    if (!devMode && !user) throw new Error("User not found");
    if (!devMode && user!.tickets < total) throw new Error("Insufficient balance");
    if (!devMode && user!.gamblingBanned) throw new Error("Banned from gambling");
    if (!devMode) await this.economyService.deductTickets(userId, total);

    this.activeGames.set(userId, { userId, bid, ratAmount, droppedAt: Date.now() });
    const updated = devMode ? null : await this.userService.getById(userId);
    this.logger.info(`drop bid:${bid} ratAmount:${ratAmount} total:${total}`);
    return { phase: "dropping", bid: total, balance: updated?.tickets ?? 0, slotIndex: null, multiplier: 0, payout: 0, net: 0, label: "", tone: "", banned: false, kickAvailable: false };
  }

  async settle(userId: string, slotIndexes: number[], devMode?: boolean, devOverrides?: PachinkoDevOverrides): Promise<PachinkoState> {
    const game = this.activeGames.get(userId);
    if (!game) throw new Error("No active drop");
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
    if (!devMode && totalPayout > 0) await this.economyService.addTickets(userId, totalPayout);

    const user = devMode ? null : await this.userService.getById(userId);
    let gamblingWinnings = (user?.gamblingWinnings ?? 0) + Math.max(0, net);
    let gamblingBanned = user?.gamblingBanned ?? false;
    if (!devMode && totalPayout > 0 && gamblingWinnings >= GAMBLING_BAN_THRESHOLD && !gamblingBanned) gamblingBanned = true;
    if (!devMode) await this.db.update(schema.users).set({ gamblingWinnings, gamblingBanned, updated: nowIso() }).where(eq(schema.users.id, userId));

    this.activeGames.delete(userId);

    if (!devMode && user) {
      await this.db.insert(schema.history).values({
        id: newId(), userId, owner: { id: user.id, username: user.username },
        type: "pachinko", label: net >= 0 ? `${usedSlots.length} крыс +${net}` : `${usedSlots.length} крыс ${net}`, image: "",
        bid: totalCost, payout: totalPayout, net,
        data: { ratAmount: game.ratAmount, perRatBid: game.bid, slots: usedSlots }, created: nowIso(),
      });
    }

    const label = net >= 0 ? `${usedSlots.length} крысы: выигрыш +${net}` : `${usedSlots.length} крысы: проигрыш ${net}`;
    const tone = this.toneFromNet(net, totalCost, 0);
    this.logger.info(`settle rats:${usedSlots.length} totalPayout:${totalPayout} net:${net}`);

    const updated = devMode ? null : await this.userService.getById(userId);
    return { phase: "done", bid: totalCost, balance: updated?.tickets ?? 0, slotIndex: null, multiplier: 0, payout: totalPayout, net, label, tone, banned: gamblingBanned, kickAvailable: false };
  }

  abandon(userId: string): void { this.activeGames.delete(userId); }

  async sync(userId: string): Promise<PachinkoState> {
    const game = this.activeGames.get(userId);
    if (!game) return this.idleState();
    const user = await this.userService.getById(userId);
    const kickAvailable = Date.now() - game.droppedAt > 15_000;
    return { phase: "dropping", bid: game.bid * game.ratAmount, balance: user?.tickets ?? 0, slotIndex: null, multiplier: 0, payout: 0, net: 0, label: "", tone: "", banned: user?.gamblingBanned ?? false, kickAvailable };
  }
}