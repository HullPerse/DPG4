export const MINE_COUNT_OPTIONS = [1, 2, 3, 5, 8, 10];

export function computeMultiplier(mineCount: number, revealedCount: number): number {
  const GRID = 5;
  const HOUSE_EDGE = 0.97;
  if (revealedCount === 0) return 1;
  let prob = 1;
  for (let i = 0; i < revealedCount; i++) {
    prob *= (GRID * GRID - mineCount - i) / (GRID * GRID - i);
  }
  return Math.max(1, Math.floor((HOUSE_EDGE / prob) * 100) / 100);
}

export function formatMultiplier(mult: number): string {
  return `${mult.toFixed(2)}x`;
}
