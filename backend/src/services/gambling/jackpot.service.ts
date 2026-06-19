import { eq } from "drizzle-orm";
import * as schema from "@/db/schema.db";
import { newId, nowIso } from "@/lib/index.utils";
import { broadcast } from "@/lib/websocket.utils";
import { Db } from "@/types/server";
import { GAMBLING_BAN_THRESHOLD } from "@/lib/gambling.constants";
import { updateTicketItem } from "@/lib/ticket.helpers";
import Logger from "@/lib/logger.utils";

export interface JackpotDevOverrides { devForceWin?: boolean; devShowWinningNumber?: boolean; }

const JACKPOT_COST = 10;
const JACKPOT_RANGE = 1000;
const JACKPOT_PERCENT = 0.05;

function todayDateString(): string {
  const msk = new Date(Date.now() + 3 * 60 * 60 * 1000);
  return msk.toISOString().slice(0, 10);
}

function generateWinningNumber(): number { return Math.floor(Math.random() * JACKPOT_RANGE) + 1; }

export default class JackpotService {
  private logger = new Logger("JACKPOT");

  constructor(private db: Db) {}

  private async ensureFreshNumber(jackpotRow: typeof schema.jackpot.$inferSelect, ts: string) {
    const today = todayDateString();
    if (jackpotRow.winningNumberDate === today) return;
    const newNumber = generateWinningNumber();
    await this.db.update(schema.jackpot).set({ winningNumber: newNumber, winningNumberDate: today, updated: ts }).where(eq(schema.jackpot.id, jackpotRow.id));
  }

  async getStatus() {
    const [row] = await this.db.select().from(schema.jackpot).limit(1);
    if (!row) return { pool: 0, lastWinnerId: null as string | null, lastWinnerUsername: null as string | null, lastWinAmount: null as number | null, lastWinDate: null as string | null };
    return { pool: row.pool, lastWinnerId: row.lastWinnerId, lastWinnerUsername: row.lastWinnerUsername, lastWinAmount: row.lastWinAmount, lastWinDate: row.lastWinDate };
  }

  async addToPool(ticketAmount: number) {
    const contribution = Math.floor(ticketAmount * JACKPOT_PERCENT);
    if (contribution < 1) return;
    let [row] = await this.db.select().from(schema.jackpot).limit(1);
    const ts = nowIso();
    const today = todayDateString();
    if (row) {
      await this.db.update(schema.jackpot).set({ pool: row.pool + contribution, updated: ts }).where(eq(schema.jackpot.id, row.id));
    } else {
      const id = newId();
      await this.db.insert(schema.jackpot).values({ id, pool: contribution, winningNumber: generateWinningNumber(), winningNumberDate: today, created: ts, updated: ts });
    }
    broadcast("jackpot", "update", undefined);
  }

  async play(userId: string, devMode?: boolean, devOverrides?: JackpotDevOverrides) {
    if (!devMode) {
      const [userRow] = await this.db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
      if (!userRow) return { error: "User not found" };
      if (userRow.tickets < JACKPOT_COST) return { error: "Not enough tickets" };
      if (userRow.gamblingBanned) return { error: "Banned from gambling" };
    }

    let [jackpotRow] = await this.db.select().from(schema.jackpot).limit(1);
    if (!jackpotRow) return { error: "Jackpot not initialized" };
    const ts = nowIso();
    await this.ensureFreshNumber(jackpotRow, ts);
    const [refreshed] = await this.db.select().from(schema.jackpot).limit(1);
    if (!refreshed) return { error: "Jackpot not found" };

    const chosen = Math.floor(Math.random() * JACKPOT_RANGE) + 1;
    const winningNumber = refreshed.winningNumber;
    const isWin = devOverrides?.devForceWin || chosen === winningNumber;

    if (!devMode) {
      const [userRow] = await this.db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
      const newTickets = userRow!.tickets - JACKPOT_COST;
      await this.db.update(schema.users).set({ tickets: newTickets, updated: ts }).where(eq(schema.users.id, userId));
      await updateTicketItem(this.db, userId, newTickets);

      if (isWin) {
        const winAmount = refreshed.pool;
        const totalTickets = newTickets + winAmount;
        await this.db.update(schema.users).set({ tickets: totalTickets, gamblingWinnings: userRow!.gamblingWinnings + winAmount, updated: ts }).where(eq(schema.users.id, userId));
        await updateTicketItem(this.db, userId, totalTickets);
        const newWinningNumber = generateWinningNumber();
        const today = todayDateString();
        await this.db.update(schema.jackpot).set({ pool: 0, winningNumber: newWinningNumber, winningNumberDate: today, lastWinnerId: userId, lastWinnerUsername: userRow!.username, lastWinAmount: winAmount, lastWinDate: ts, updated: ts }).where(eq(schema.jackpot.id, refreshed.id));
        broadcast("jackpot", "update", undefined);

        if (userRow!.gamblingWinnings + winAmount >= GAMBLING_BAN_THRESHOLD) {
          await this.db.update(schema.users).set({ gamblingBanned: true, updated: ts }).where(eq(schema.users.id, userId));
          this.logger.info(`gambling ban triggered (jackpot win ${winAmount})`);
          return { win: true, chosen, winningNumber, prize: winAmount, newBalance: totalTickets, banned: true, error: null as string | null };
        }

        this.logger.info(`jackpot win ${winAmount} tickets`);
        return { win: true, chosen, winningNumber, prize: winAmount, newBalance: totalTickets, banned: false, error: null as string | null };
      }

      broadcast("jackpot", "update", undefined);
      return { win: false, chosen, winningNumber, prize: 0, newBalance: newTickets, banned: false, error: null as string | null };
    }

    return { win: isWin, chosen, winningNumber: devOverrides?.devShowWinningNumber ? winningNumber : winningNumber, prize: isWin ? refreshed.pool : 0, newBalance: 0, banned: false, error: null as string | null };
  }
}