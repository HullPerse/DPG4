import { HistoryResponse, LeaderboardEntry } from "@/types/history";
import { apiFetch } from "./client.api";

export function getHistory(page = 1, limit = 50, type?: string) {
  let url = `/history?page=${page}&limit=${limit}`;
  if (type) url += `&type=${type}`;
  return apiFetch<HistoryResponse>(url);
}

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
