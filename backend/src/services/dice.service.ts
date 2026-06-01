import { eq } from "drizzle-orm";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import * as schema from "../db/schema";
import { getUserById, scoreUser } from "./user.service";
import { logger } from "../lib/logger";
import { nowIso } from "../lib/dates";

type Db = BunSQLiteDatabase<typeof schema>;

interface DiceResult {
  payout: number;
  label: string;
  tone: "jackpot" | "win" | "lose" | "chance";
}

function getRandomDice(): [number, number, number] {
  return [
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
  ];
}

function calculateResult(values: [number, number, number], bid: number): DiceResult {
  const sorted = [...values].sort((a, b) => a - b);
  const [a, b, c] = sorted;
  const unique = new Set(values);

  if (a === 1 && b === 2 && c === 3) {
    return {
      payout: -bid,
      label: "1 · 2 · 3 — проигрыш",
      tone: "lose",
    };
  }

  if (a === 4 && b === 5 && c === 6) {
    return {
      payout: bid * 2,
      label: "4 · 5 · 6 — выигрыш",
      tone: "win",
    };
  }

  if (a === 1 && b === 1 && c === 1) {
    return {
      payout: bid * 6,
      label: "Три единицы — джекпот",
      tone: "jackpot",
    };
  }

  if (unique.size === 1) {
    return {
      payout: bid * 3,
      label: `Три ${a} — выигрыш`,
      tone: "win",
    };
  }

  if (unique.size === 2) {
    const win = Math.random() >= 0.5;
    return {
      payout: win ? bid * 2 + Math.ceil(bid / 3) : Math.ceil(bid / 3),
      label: win ? "Пара — удача" : "Пара — не повезло",
      tone: "chance",
    };
  }

  const win = Math.random() >= 0.5;
  return {
    payout: win ? bid * 2 + Math.ceil(bid * 2 / 3) : Math.ceil(bid * 2 / 3),
    label: win ? "Разные числа — выигрыш" : "Разные числа — проигрыш",
    tone: "chance",
  };
}

export async function rollDice(
  db: Db,
  userId: string,
  bid: number,
): Promise<{
  values: [number, number, number];
  payout: number;
  net: number;
  label: string;
  tone: "jackpot" | "win" | "lose" | "chance";
  balance: number;
  banned: boolean;
}> {
  if (bid < 1 || bid > 10 || !Number.isInteger(bid)) throw new Error("Invalid bid");

  const user = await getUserById(db, userId);
  if (!user) throw new Error("User not found");
  if (user.money < bid) throw new Error("Insufficient balance");
  if (user.gamblingBanned) throw new Error("Banned from gambling");

  const values = getRandomDice();
  const result = calculateResult(values, bid);
  const { payout, label, tone } = result;
  const net = -bid + payout;

  let gamblingWinnings: number = user.gamblingWinnings ?? 0;
  let gamblingBanned: boolean = user.gamblingBanned ?? false;

  if (payout > 0) {
    gamblingWinnings += payout;
    if (gamblingWinnings >= 30 && !gamblingBanned) {
      gamblingBanned = true;
    }
  }

  await scoreUser(db, userId, -bid);

  if (payout !== 0) {
    await scoreUser(db, userId, payout);
  }

  await db
    .update(schema.users)
    .set({
      gamblingWinnings,
      gamblingBanned,
      updated: nowIso(),
    })
    .where(eq(schema.users.id, userId));

  const updatedUser = await getUserById(db, userId);

  const netLabel =
    net >= 0
      ? `${label} · итого +${net}`
      : `${label} · итого ${net}`;

  logger.info(user.username, "rolled dice", values.join(", "), `net:${net}`);

  return {
    values,
    payout,
    net,
    label,
    tone,
    balance: updatedUser?.money ?? 0,
    banned: gamblingBanned,
  };
}
