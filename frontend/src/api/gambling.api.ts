import { apiFetch } from "./client.api";

export interface DiceRollResult {
  values: [number, number, number];
  payout: number;
  net: number;
  label: string;
  tone: "jackpot" | "win" | "lose" | "chance";
  balance: number;
  banned: boolean;
}

export async function rollDice(userId: string, bid: number): Promise<DiceRollResult> {
  return apiFetch<DiceRollResult>("/utils/dice-roll", {
    method: "POST",
    body: { userId, bid },
  });
}

export async function unbanDice(userId: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>("/utils/dice-unban", {
    method: "POST",
    body: { userId },
  });
}
