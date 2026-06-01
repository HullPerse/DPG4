import { apiFetch } from "./client.api";

export interface DiceRollResult {
  values: [number, number, number];
  payout: number;
  net: number;
  label: string;
  tone: "jackpot" | "win" | "lose" | "chance";
  balance: number;
}

export async function rollDice(userId: string): Promise<DiceRollResult> {
  return apiFetch<DiceRollResult>("/utils/dice-roll", {
    method: "POST",
    body: { userId },
  });
}
