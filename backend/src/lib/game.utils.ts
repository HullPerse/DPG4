import { USER_ACTIONS } from "./constants";

/** @see frontend calculateScore */
export function calculateScore(realTime: number, hltbTime: number): number {
  if (Number.isNaN(realTime) || Number.isNaN(hltbTime) || hltbTime <= 0)
    return 3;

  const ratio = realTime / hltbTime;
  const multiplier = Math.max(0.5, Math.min(1.7, 0.5 + 0.6 * ratio));
  const score = multiplier * hltbTime;
  const finalScore = Math.max(3, Math.floor(score));
  const bonus = Math.floor(finalScore / 3);

  let maxScore = Math.min(finalScore + bonus, 100);

  if (maxScore > 60) {
    maxScore = Math.floor(maxScore * 0.9);
  }

  return maxScore;
}

/** @see frontend calculateCost */
export function calculateCost(): number {
  return 2;
}

export function getNextDice(
  realTime: number,
  currentCell: number,
  action: typeof USER_ACTIONS.MOVE_POSITIVE | typeof USER_ACTIONS.MOVE_NEGATIVE,
): number {
  if (action === USER_ACTIONS.MOVE_NEGATIVE) {
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

export function weightedRandom(max: number): number {
  const items = Array.from({ length: max }, (_, i) => i + 1);
  const weights = Array.from({ length: max }, (_, i) =>
    Math.min(i + 1, max - i),
  );
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r < 0) return items[i];
  }
  return items[items.length - 1];
}
