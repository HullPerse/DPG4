import { apiFetch } from "./client.api";
import type { StatsResponse, UserStatsResponse } from "@/types/stats";

export function getStats() {
  return apiFetch<StatsResponse>("/history/stats");
}

export function getUserStats(userId: string): Promise<UserStatsResponse> {
  return apiFetch<UserStatsResponse>(`/stats/user/${userId}`);
}
