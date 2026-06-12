export const GAMBLING_GAME_FILTERS = [
  { value: undefined, label: "Все" },
  { value: "dice" as const, label: "Чинчирорин" },
  { value: "blackjack" as const, label: "Блэкджек" },
  { value: "rocket" as const, label: "Ракетник" },
  { value: "pachinko" as const, label: "Пачинко" },
  { value: "mines" as const, label: "Минное поле" },
] as const;

export const LEADERBOARD_PERIODS = [
  { value: "alltime" as const, label: "За всё время" },
  { value: "weekly" as const, label: "За неделю" },
] as const;

export const GAME_TYPE_LABELS: Record<string, string> = {
  dice: "Чинчирорин",
  blackjack: "Блэкджек",
  rocket: "Ракетник",
  pachinko: "Пачинко",
  mines: "Минное поле",
};

export const GAME_CHART_COLORS: Record<string, string> = {
  dice: "#c4a7e7",
  blackjack: "#f6c177",
  rocket: "#eb6f92",
  pachinko: "#9ccfd8",
  mines: "#7fda72",
};

export const PODIUM_COLORS = ["#ffd700", "#c0c0c0", "#cd7f32"] as const;

export const CHART_THEME = {
  grid: "#403d52",
  muted: "#6e6a86",
  text: "#e0def4",
  positive: "#7fda72",
  negative: "#ec7676",
  primary: "#f6c177",
  iris: "#c4a7e7",
  card: "#232136",
  border: "#524f67",
} as const;

export function formatNet(value: number): string {
  return `${value >= 0 ? "+" : ""}${value}`;
}

export function netColorClass(value: number): string {
  if (value > 0) return "text-emerald-400";
  if (value < 0) return "text-red-400";
  return "text-muted";
}

export function winRate(wins: number, games: number): number {
  if (games === 0) return 0;
  return Math.round((wins / games) * 100);
}
