import { apiFetch } from "./client.api";

export type DailyNet = {
  date: string;
  net: number;
  gamesPlayed: number;
};

export type GameDistribution = {
  type: string;
  count: number;
  totalNet: number;
};

export type BetDistribution = {
  range: string;
  count: number;
};

export type StatsSummary = {
  totalPlayed: number;
  totalWagered: number;
  totalNet: number;
  winRate: number;
  biggestWin: number;
  avgBet: number;
};

export type StatsResponse = {
  dailyNet: DailyNet[];
  gameDistribution: GameDistribution[];
  betDistribution: BetDistribution[];
  summary: StatsSummary;
};

export function getStats() {
  return apiFetch<StatsResponse>("/history/stats");
}
