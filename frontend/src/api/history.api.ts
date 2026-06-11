import { apiFetch } from "./client.api";

export type HistoryRecord = {
  id: string;
  userId: string;
  owner: { id: string; username: string } | null;
  type: "wheel" | "dice" | "blackjack" | "rocket" | "pachinko" | "mines";
  label: string;
  image: string;
  bid: number;
  payout: number;
  net: number;
  data: Record<string, unknown> | null;
  created: string;
};

export type HistoryResponse = {
  data: HistoryRecord[];
  total: number;
  page: number;
  limit: number;
};

export function getHistory(
  page = 1,
  limit = 50,
  type?: string,
) {
  let url = `/history?page=${page}&limit=${limit}`;
  if (type) url += `&type=${type}`;
  return apiFetch<HistoryResponse>(url);
}

export type LeaderboardEntry = {
  userId: string;
  username: string;
  avatar: string;
  color: string;
  currentMoney: number;
  totalNet: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  biggestWin: number;
};

export function getLeaderboard(opts?: {
  gameType?: "dice" | "blackjack" | "rocket" | "pachinko" | "mines";
  period?: "alltime" | "weekly";
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (opts?.gameType) params.set("gameType", opts.gameType);
  if (opts?.period) params.set("period", opts.period);
  if (opts?.limit) params.set("limit", String(opts.limit));
  const qs = params.toString();
  return apiFetch<{ data: LeaderboardEntry[] }>(
    `/history/leaderboard${qs ? `?${qs}` : ""}`,
  );
}
