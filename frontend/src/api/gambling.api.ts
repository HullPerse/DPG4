import { apiFetch } from "./client.api";
import type { BlackjackState, RocketState, RocketHistoryEntry, PachinkoState } from "@/types/gamble";

export type {
  BlackjackState,
  BlackjackGameResult,
  RocketState,
  RocketHistoryEntry,
  PachinkoState,
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

export async function launchRocket(
  userId: string,
  bid: number,
): Promise<RocketState> {
  return apiFetch<RocketState>("/utils/rocket-launch", {
    method: "POST",
    body: { userId, bid },
  });
}

export async function cashoutRocket(userId: string): Promise<RocketState> {
  return apiFetch<RocketState>("/utils/rocket-cashout", {
    method: "POST",
    body: { userId },
  });
}

export async function pollRocket(userId: string): Promise<RocketState> {
  return apiFetch<RocketState>("/utils/rocket-poll", {
    method: "POST",
    body: { userId },
  });
}

export async function abandonRocket(userId: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>("/utils/rocket-abandon", {
    method: "POST",
    body: { userId },
  });
}

export async function dismissRocket(userId: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>("/utils/rocket-dismiss", {
    method: "POST",
    body: { userId },
  });
}

export async function getRocketHistory(): Promise<RocketHistoryEntry[]> {
  return apiFetch<RocketHistoryEntry[]>("/utils/rocket-history", {
    method: "GET",
  });
}

export async function dropPachinko(
  userId: string,
  bid: number,
): Promise<PachinkoState> {
  return apiFetch<PachinkoState>("/utils/pachinko-drop", {
    method: "POST",
    body: { userId, bid },
  });
}

export async function settlePachinko(
  userId: string,
  slotIndex: number,
): Promise<PachinkoState> {
  return apiFetch<PachinkoState>("/utils/pachinko-settle", {
    method: "POST",
    body: { userId, slotIndex },
  });
}

export async function syncPachinko(userId: string): Promise<PachinkoState> {
  return apiFetch<PachinkoState>("/utils/pachinko-sync", {
    method: "POST",
    body: { userId },
  });
}

export async function abandonPachinko(
  userId: string,
): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>("/utils/pachinko-abandon", {
    method: "POST",
    body: { userId },
  });
}
