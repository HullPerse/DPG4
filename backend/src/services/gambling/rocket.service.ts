import { eq } from "drizzle-orm";
import * as schema from "../../db/schema";
import { getUserById, scoreUser } from "../user.service";
import { logger } from "../../lib/logger";
import { nowIso } from "../../lib/dates";
import type { ActiveRocketGame, RocketState } from "@/types/gambling";
import type { Db } from "@/types";

const activeGames = new Map<string, ActiveRocketGame>();
const crashHistory: { crashPoint: number; timestamp: number }[] = [];
const MAX_HISTORY = 50;
const HOUSE_EDGE = 0.96;

function generateCrashPoint(): number {
  const e = Math.random();
  return Math.max(1, Math.floor((HOUSE_EDGE / (1 - e)) * 100) / 100);
}

function computeMultiplier(elapsedMs: number): number {
  const t = elapsedMs / 1000;
  return Math.max(1, Math.floor((1 + 0.08 * t + 0.02 * t * t) * 100) / 100);
}

function idleState(): RocketState {
  return {
    phase: "idle", multiplier: 0, crashPoint: 0,
    bid: 0, balance: 0, net: 0, label: "", tone: "", banned: false,
  };
}

async function processCrash(
  db: Db,
  userId: string,
  game: ActiveRocketGame,
): Promise<RocketState> {
  crashHistory.push({ crashPoint: game.crashPoint, timestamp: Date.now() });
  if (crashHistory.length > MAX_HISTORY) crashHistory.shift();

  await scoreUser(db, userId, -game.bid);

  const user = await getUserById(db, userId);
  activeGames.delete(userId);

  const label = `Крах на ${game.crashPoint.toFixed(2)}x — проигрыш -${game.bid}`;

  logger.info("system", `rocket crash user:${userId} bid:${game.bid} crash:${game.crashPoint}x`);

  return {
    phase: "crashed",
    multiplier: game.crashPoint,
    crashPoint: game.crashPoint,
    bid: game.bid,
    balance: user?.money ?? 0,
    net: -game.bid,
    label,
    tone: "lose",
    banned: user?.gamblingBanned ?? false,
  };
}

export async function launchRocket(
  db: Db,
  userId: string,
  bid: number,
): Promise<RocketState> {
  if (bid < 1 || bid > 10 || !Number.isInteger(bid))
    throw new Error("Invalid bid");

  if (activeGames.has(userId)) throw new Error("Game already in progress");

  const user = await getUserById(db, userId);
  if (!user) throw new Error("User not found");
  if (user.money < bid) throw new Error("Insufficient balance");
  if (user.gamblingBanned) throw new Error("Banned from gambling");

  const crashPoint = generateCrashPoint();
  const now = Date.now();

  activeGames.set(userId, {
    userId, bid, crashPoint, launchedAt: now, cashedOut: false, cashoutMultiplier: null,
  });

  logger.info(user.username, "launched rocket", `bid:${bid}`, `crash:${crashPoint}x`);

  return {
    phase: "launching", multiplier: 1, crashPoint,
    bid, balance: user.money, net: 0, label: "", tone: "", banned: false,
  };
}

export async function cashoutRocket(
  db: Db,
  userId: string,
): Promise<RocketState> {
  const game = activeGames.get(userId);
  if (!game) throw new Error("No active game");
  if (game.cashedOut) throw new Error("Already cashed out");

  const elapsed = Date.now() - game.launchedAt;
  const currentMultiplier = computeMultiplier(elapsed);

  if (currentMultiplier >= game.crashPoint) {
    return processCrash(db, userId, game);
  }

  game.cashedOut = true;
  game.cashoutMultiplier = currentMultiplier;

  const payout = Math.floor(game.bid * currentMultiplier);
  const net = payout - game.bid;

  await scoreUser(db, userId, -game.bid);
  await scoreUser(db, userId, payout);

  const user = await getUserById(db, userId);
  const gamblingWinnings = (user?.gamblingWinnings ?? 0) + payout;
  const gamblingBanned = gamblingWinnings >= 30;

  await db
    .update(schema.users)
    .set({ gamblingWinnings, gamblingBanned, updated: nowIso() })
    .where(eq(schema.users.id, userId));

  const label = `Кассаут ${currentMultiplier.toFixed(2)}x — выигрыш +${net}`;
  const tone: "jackpot" | "win" | "chance" =
    net >= game.bid * 5 ? "jackpot" : net >= game.bid * 2 ? "win" : "chance";

  activeGames.delete(userId);

  logger.info("system", `rocket cashout user:${userId} mult:${currentMultiplier}x net:${net}`);

  return {
    phase: "cashed", multiplier: currentMultiplier, crashPoint: game.crashPoint,
    bid: game.bid, balance: user?.money ?? 0, net, label, tone, banned: gamblingBanned,
  };
}

export async function pollRocket(
  db: Db,
  userId: string,
): Promise<RocketState> {
  const game = activeGames.get(userId);
  if (!game) return idleState();

  const elapsed = Date.now() - game.launchedAt;
  const currentMultiplier = computeMultiplier(elapsed);

  if (currentMultiplier >= game.crashPoint) {
    return processCrash(db, userId, game);
  }

  return {
    phase: "flying", multiplier: currentMultiplier, crashPoint: game.crashPoint,
    bid: game.bid, balance: 0, net: 0, label: "", tone: "", banned: false,
  };
}

export function abandonRocket(userId: string): void {
  activeGames.delete(userId);
}

export function getRocketHistory(): { crashPoint: number; timestamp: number }[] {
  return [...crashHistory];
}
