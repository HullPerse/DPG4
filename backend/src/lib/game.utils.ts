/** @see frontend calculateScore */
export function calculateScore(realTime: number, hltbTime: number): number {
  if (Number.isNaN(realTime) || Number.isNaN(hltbTime) || hltbTime <= 0) return 3;

  const ratio = realTime / hltbTime;
  const multiplier = Math.max(0.5, Math.min(1.7, 0.5 + 0.6 * ratio));
  const score = multiplier * hltbTime;
  const finalScore = Math.max(3, Math.floor(score));
  const bonus = Math.floor(finalScore / 3);
  return finalScore + bonus;
}

/** @see frontend calculateCost */
export function calculateCost(): number {
  return 2;
}

export function getNextDice(
  realTime: number,
  currentCell: number,
  action: "MOVE_POSITIVE" | "MOVE_NEGATIVE",
): number {
  if (action === "MOVE_NEGATIVE") {
    if (currentCell >= 81) return 2;
    return 1;
  }
  if (currentCell >= 81) return 1;
  if (realTime <= 4) return 1;
  if (realTime <= 10) return 1;
  if (realTime <= 16) return 2;
  if (realTime <= 24) return 2;
  if (realTime <= 40) return 3;
  return 4;
}

export function removeFirst(arr: string[], value: string): string[] {
  const index = arr.indexOf(value);
  return index === -1 ? arr : arr.filter((_, i) => i !== index);
}
