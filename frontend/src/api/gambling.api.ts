import { apiFetch } from "./client.api";
import type { BlackjackState } from "@/types/gamble";

export type {
  BlackjackState,
  BlackjackGameResult,
} from "@/types/gamble";

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

export async function blackjackDeal(
  userId: string,
  bid: number,
): Promise<BlackjackState> {
  return apiFetch<BlackjackState>("/utils/blackjack-deal", {
    method: "POST",
    body: { userId, bid },
  });
}

export async function blackjackHit(userId: string): Promise<BlackjackState> {
  return apiFetch<BlackjackState>("/utils/blackjack-hit", {
    method: "POST",
    body: { userId },
  });
}

export async function blackjackStand(userId: string): Promise<BlackjackState> {
  return apiFetch<BlackjackState>("/utils/blackjack-stand", {
    method: "POST",
    body: { userId },
  });
}

export async function syncBlackjack(
  userId: string,
): Promise<BlackjackState | null> {
  const res = await apiFetch<{ state: BlackjackState | null }>(
    "/utils/blackjack-sync",
    { method: "POST", body: { userId } },
  );
  return res.state;
}

export async function abandonBlackjack(
  userId: string,
): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>("/utils/blackjack-abandon", {
    method: "POST",
    body: { userId },
  });
}
