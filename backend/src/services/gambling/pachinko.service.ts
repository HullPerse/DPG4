import { eq } from "drizzle-orm";
import * as schema from "../../db/schema";
import { getUserById, scoreUser } from "../user.service";
import { logger } from "../../lib/logger";
import { nowIso } from "../../lib/dates";
import type { Db } from "@/types";

/** Left → right. Best at edges, 0.5x cluster in center. */
export const PACHINKO_SLOT_MULTIPLIERS = [
  5, 3, 2, 1.5, 1, 0.5, 0.5, 0.5, 1, 1.5, 2, 3, 5,
] as const;

export type PachinkoPhase = "idle" | "dropping" | "done";

export interface PachinkoState {
  phase: PachinkoPhase;
  bid: number;
  balance: number;
  slotIndex: number | null;
  multiplier: number;
  payout: number;
  net: number;
  label: string;
  tone: "jackpot" | "win" | "lose" | "chance" | "";
  banned: boolean;
}

interface ActivePachinkoGame {
  userId: string;
  bid: number;
  droppedAt: number;
}

const activeGames = new Map<string, ActivePachinkoGame>();

function idleState(): PachinkoState {
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

function toneFromNet(
  net: number,
  bid: number,
  multiplier: number,
): "jackpot" | "win" | "lose" | "chance" {
  if (net < 0) return "lose";
  if (multiplier >= 5 || net >= bid * 4) return "jackpot";
  if (net >= bid) return "win";
  return "chance";
}

export async function dropPachinko(
  db: Db,
  userId: string,
  bid: number,
): Promise<PachinkoState> {
  if (bid < 1 || bid > 10 || !Number.isInteger(bid))
    throw new Error("Invalid bid");

  if (activeGames.has(userId)) throw new Error("Drop already in progress");

  const user = await getUserById(db, userId);
  if (!user) throw new Error("User not found");
  if (user.money < bid) throw new Error("Insufficient balance");
  if (user.gamblingBanned) throw new Error("Banned from gambling");

  await scoreUser(db, userId, -bid);

  activeGames.set(userId, { userId, bid, droppedAt: Date.now() });

  const updated = await getUserById(db, userId);

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

export async function settlePachinko(
  db: Db,
  userId: string,
  slotIndex: number,
): Promise<PachinkoState> {
  const slot = Math.floor(slotIndex);
  const game = activeGames.get(userId);
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
    await scoreUser(db, userId, payout);
  }

  const user = await getUserById(db, userId);
  let gamblingWinnings = (user?.gamblingWinnings ?? 0) + Math.max(0, payout);
  let gamblingBanned = user?.gamblingBanned ?? false;

  if (payout > 0 && gamblingWinnings >= 30 && !gamblingBanned) {
    gamblingBanned = true;
  }

  await db
    .update(schema.users)
    .set({ gamblingWinnings, gamblingBanned, updated: nowIso() })
    .where(eq(schema.users.id, userId));

  activeGames.delete(userId);

  const label =
    net >= 0
      ? `Слот ${multiplier}x — выигрыш +${net}`
      : `Слот ${multiplier}x — проигрыш ${net}`;

  const tone = toneFromNet(net, game.bid, multiplier);

  logger.info(
    "system",
    `pachinko settle user:${userId} slot:${slot} mult:${multiplier}x net:${net}`,
  );

  const updated = await getUserById(db, userId);

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

export function abandonPachinko(userId: string): void {
  activeGames.delete(userId);
}

export async function syncPachinko(
  db: Db,
  userId: string,
): Promise<PachinkoState> {
  const game = activeGames.get(userId);
  if (!game) return idleState();

  const user = await getUserById(db, userId);

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
