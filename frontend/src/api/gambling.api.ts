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

export async function rollDiceDealer(bid: number): Promise<DiceDealerResult> {
  return apiFetch<DiceDealerResult>("/utils/dice-roll", {
    method: "POST",
    body: { bid },
  });
}

export async function rerollDiceDealer(): Promise<DiceDealerResult> {
  return apiFetch<DiceDealerResult>("/utils/dice-roll", {
    method: "POST",
  });
}

export async function rollDicePlayer(): Promise<DiceGameResult> {
  return apiFetch<DiceGameResult>("/utils/dice-roll", {
    method: "POST",
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

export async function blackjackDeal(bid: number): Promise<BlackjackState> {
  return apiFetch<BlackjackState>("/utils/blackjack-deal", {
    method: "POST",
    body: { bid },
  });
}

export async function blackjackHit(): Promise<BlackjackState> {
  return apiFetch<BlackjackState>("/utils/blackjack-hit", {
    method: "POST",
  });
}

export async function blackjackStand(): Promise<BlackjackState> {
  return apiFetch<BlackjackState>("/utils/blackjack-stand", {
    method: "POST",
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

export async function launchRocket(bid: number): Promise<RocketState> {
  return apiFetch<RocketState>("/utils/rocket-launch", {
    method: "POST",
    body: { bid },
  });
}

export async function cashoutRocket(): Promise<RocketState> {
  return apiFetch<RocketState>("/utils/rocket-cashout", {
    method: "POST",
  });
}

export async function pollRocket(): Promise<RocketState> {
  return apiFetch<RocketState>("/utils/rocket-poll", {
    method: "POST",
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
): Promise<PachinkoState> {
  return apiFetch<PachinkoState>("/utils/pachinko-drop", {
    method: "POST",
    body: { bid, ratAmount },
  });
}

export async function settlePachinko(
  slotIndexes: number[],
): Promise<PachinkoState> {
  return apiFetch<PachinkoState>("/utils/pachinko-settle", {
    method: "POST",
    body: { slotIndexes },
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
): Promise<MinesState> {
  return apiFetch<MinesState>("/utils/mines-start", {
    method: "POST",
    body: { bid, mineCount },
  });
}

export async function revealMines(x: number, y: number): Promise<MinesState> {
  return apiFetch<MinesState>("/utils/mines-reveal", {
    method: "POST",
    body: { x, y },
  });
}

export async function cashoutMines(): Promise<MinesState> {
  return apiFetch<MinesState>("/utils/mines-cashout", {
    method: "POST",
  });
}

export async function abortMines(): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>("/utils/mines-abort", {
    method: "POST",
  });
}
