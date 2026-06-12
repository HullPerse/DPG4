export interface GameResultData {
  net: number;
  label: string;
  tone: string;
}

export function getResultColor(result: GameResultData | null): string {
  if (!result) return "";
  if (result.net > 0) {
    if (result.tone === "jackpot") return "text-amber-400";
    return "text-emerald-400";
  }
  if (result.net < 0) return "text-red-400";
  return "text-muted";
}
