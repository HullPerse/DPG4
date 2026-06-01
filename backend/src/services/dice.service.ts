import { eq } from "drizzle-orm";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import * as schema from "../db/schema";
import { getUserById, scoreUser } from "./user.service";
import { createActivity } from "./activity.service";
import { logger } from "../lib/logger";

type Db = BunSQLiteDatabase<typeof schema>;

const BASE_PRICE = 3;

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

function calculateResult(values: [number, number, number]): DiceResult {
  const sorted = [...values].sort((a, b) => a - b);
  const [a, b, c] = sorted;
  const unique = new Set(values);

  if (a === 1 && b === 2 && c === 3) {
    return {
      payout: -BASE_PRICE * 2,
      label: "1 · 2 · 3 — проигрыш ×2",
      tone: "lose",
    };
  }

  if (a === 4 && b === 5 && c === 6) {
    return {
      payout: BASE_PRICE * 3,
      label: "4 · 5 · 6 — выигрыш ×3",
      tone: "win",
    };
  }

  if (a === 1 && b === 1 && c === 1) {
    return {
      payout: BASE_PRICE * 6,
      label: "Три единицы — джекпот ×6",
      tone: "jackpot",
    };
  }

  if (unique.size === 1) {
    return {
      payout: BASE_PRICE * 3,
      label: `Три ${a} — выигрыш ×3`,
      tone: "win",
    };
  }

  if (unique.size === 2) {
    const win = Math.random() >= 0.5;
    return {
      payout: win ? BASE_PRICE * 2 + 2 : -(BASE_PRICE * 0.5),
      label: win ? "Пара — удача (+8)" : "Пара — не повезло (−1.5)",
      tone: "chance",
    };
  }

  const win = Math.random() >= 0.5;
  return {
    payout: win ? BASE_PRICE * 2 + 1 : 0,
    label: win
      ? "Разные числа — выигрыш (+7)"
      : "Разные числа — проигрыш (0)",
    tone: "chance",
  };
}

export async function rollDice(
  db: Db,
  userId: string,
): Promise<{
  values: [number, number, number];
  payout: number;
  net: number;
  label: string;
  tone: "jackpot" | "win" | "lose" | "chance";
  balance: number;
}> {
  const user = await getUserById(db, userId);
  if (!user) throw new Error("User not found");
  if (user.money < BASE_PRICE) throw new Error("Insufficient balance");

  const values = getRandomDice();
  const result = calculateResult(values);
  const { payout, label, tone } = result;
  const net = -BASE_PRICE + payout;

  await scoreUser(db, userId, -BASE_PRICE);

  if (payout !== 0) {
    await scoreUser(db, userId, payout);
  }

  const updatedUser = await getUserById(db, userId);

  const netLabel =
    net >= 0
      ? `${label} · итого +${net}`
      : `${label} · итого ${net}`;

  await createActivity(db, {
    author: userId,
    image: user.avatar,
    type: "emoji",
    text: `🎲 ${user.username} бросил кости [${values.join(", ")}]: ${netLabel}`,
  });

  logger.info(user.username, "rolled dice", values.join(", "), `net:${net}`);

  return {
    values,
    payout,
    net,
    label,
    tone,
    balance: updatedUser?.money ?? 0,
  };
}
