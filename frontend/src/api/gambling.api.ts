import { apiFetch } from "./client.api";
import type {
  BlackjackState,
  GamblingConfig,
  RocketState,
  RocketHistoryEntry,
  PachinkoState,
  DiceDealerResult,
  DiceGameResult,
  MinesState,
} from "@/types/gamble";

export type { DiceDealerResult, DiceGameResult };

function withDev(body: Record<string, unknown>, overrides?: Record<string, unknown>): Record<string, unknown> {
  return overrides && Object.keys(overrides).length > 0 ? { ...body, ...overrides } : body;
}

export async function rollDiceDealer(bid: number, devOverrides?: Record<string, unknown>): Promise<DiceDealerResult> {
  return apiFetch<DiceDealerResult>("/utils/dice-roll", {
    method: "POST",
    body: withDev({ bid }, devOverrides),
  });
}

export async function rerollDiceDealer(devOverrides?: Record<string, unknown>): Promise<DiceDealerResult> {
  return apiFetch<DiceDealerResult>("/utils/dice-roll", {
    method: "POST",
    body: withDev({}, devOverrides),
  });
}

export async function rollDicePlayer(devOverrides?: Record<string, unknown>): Promise<DiceGameResult> {
  return apiFetch<DiceGameResult>("/utils/dice-roll", {
    method: "POST",
    body: withDev({}, devOverrides),
  });
}

export async function abortDice(): Promise<{
  refunded: number;
  balance: number;
}> {
  return apiFetch<{ refunded: number; balance: number }>("/utils/dice-abort", {
    method: "POST",
  });
}

export async function unbanDice(): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>("/utils/dice-unban", {
    method: "POST",
  });
}

export async function blackjackDeal(bid: number, devOverrides?: Record<string, unknown>): Promise<BlackjackState> {
  return apiFetch<BlackjackState>("/utils/blackjack-deal", {
    method: "POST",
    body: withDev({ bid }, devOverrides),
  });
}

export async function blackjackHit(devOverrides?: Record<string, unknown>): Promise<BlackjackState> {
  return apiFetch<BlackjackState>("/utils/blackjack-hit", {
    method: "POST",
    body: withDev({}, devOverrides),
  });
}

export async function blackjackStand(devOverrides?: Record<string, unknown>): Promise<BlackjackState> {
  return apiFetch<BlackjackState>("/utils/blackjack-stand", {
    method: "POST",
    body: withDev({}, devOverrides),
  });
}

export async function syncBlackjack(): Promise<BlackjackState | null> {
  const res = await apiFetch<{ state: BlackjackState | null }>(
    "/utils/blackjack-sync",
    { method: "POST" },
  );
  return res.state;
}

export async function abandonBlackjack(): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>("/utils/blackjack-abandon", {
    method: "POST",
  });
}

export async function launchRocket(bid: number, devOverrides?: Record<string, unknown>): Promise<RocketState> {
  return apiFetch<RocketState>("/utils/rocket-launch", {
    method: "POST",
    body: withDev({ bid }, devOverrides),
  });
}

export async function cashoutRocket(devOverrides?: Record<string, unknown>): Promise<RocketState> {
  return apiFetch<RocketState>("/utils/rocket-cashout", {
    method: "POST",
    body: withDev({}, devOverrides),
  });
}

export async function pollRocket(devOverrides?: Record<string, unknown>): Promise<RocketState> {
  return apiFetch<RocketState>("/utils/rocket-poll", {
    method: "POST",
    body: withDev({}, devOverrides),
  });
}

export async function abandonRocket(): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>("/utils/rocket-abandon", {
    method: "POST",
  });
}

export async function dismissRocket(): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>("/utils/rocket-dismiss", {
    method: "POST",
  });
}

export async function getRocketHistory(): Promise<RocketHistoryEntry[]> {
  return apiFetch<RocketHistoryEntry[]>("/utils/rocket-history", {
    method: "GET",
  });
}

export async function dropPachinko(
  bid: number,
  ratAmount = 1,
  devOverrides?: Record<string, unknown>,
): Promise<PachinkoState> {
  return apiFetch<PachinkoState>("/utils/pachinko-drop", {
    method: "POST",
    body: withDev({ bid, ratAmount }, devOverrides),
  });
}

export async function settlePachinko(
  slotIndexes: number[],
  devOverrides?: Record<string, unknown>,
): Promise<PachinkoState> {
  return apiFetch<PachinkoState>("/utils/pachinko-settle", {
    method: "POST",
    body: withDev({ slotIndexes }, devOverrides),
  });
}

export async function syncPachinko(): Promise<PachinkoState> {
  return apiFetch<PachinkoState>("/utils/pachinko-sync", {
    method: "POST",
  });
}

export async function fetchGamblingConfig(): Promise<GamblingConfig> {
  return apiFetch<GamblingConfig>("/utils/gambling-config", {
    method: "GET",
  });
}

export async function abandonPachinko(): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>("/utils/pachinko-abandon", {
    method: "POST",
  });
}

export async function startMines(
  bid: number,
  mineCount: number,
  devOverrides?: Record<string, unknown>,
): Promise<MinesState> {
  return apiFetch<MinesState>("/utils/mines-start", {
    method: "POST",
    body: withDev({ bid, mineCount }, devOverrides),
  });
}

export async function revealMines(x: number, y: number, devOverrides?: Record<string, unknown>): Promise<MinesState> {
  return apiFetch<MinesState>("/utils/mines-reveal", {
    method: "POST",
    body: withDev({ x, y }, devOverrides),
  });
}

export async function cashoutMines(devOverrides?: Record<string, unknown>): Promise<MinesState> {
  return apiFetch<MinesState>("/utils/mines-cashout", {
    method: "POST",
    body: withDev({}, devOverrides),
  });
}

export async function abortMines(): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>("/utils/mines-abort", {
    method: "POST",
  });
}
