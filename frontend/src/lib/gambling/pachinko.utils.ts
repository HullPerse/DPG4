/** Mirrors backend pachinko.service.ts — left → right */
export const PACHINKO_SLOT_MULTIPLIERS = [
  5, 3, 2, 1.5, 1, 0.5, 0.5, 0.5, 1, 1.5, 2, 3, 5,
] as const;

export const PACHINKO_SLOT_COUNT = PACHINKO_SLOT_MULTIPLIERS.length;

export const BOARD_WIDTH = 13;
export const SLOT_WIDTH = BOARD_WIDTH / PACHINKO_SLOT_COUNT;

export function slotCenterX(index: number): number {
  return -BOARD_WIDTH / 2 + SLOT_WIDTH / 2 + index * SLOT_WIDTH;
}

export function slotIndexFromX(x: number): number {
  if (!Number.isFinite(x)) return Math.floor(PACHINKO_SLOT_COUNT / 2);
  const idx = Math.floor((x + BOARD_WIDTH / 2) / SLOT_WIDTH);
  return Math.max(0, Math.min(PACHINKO_SLOT_COUNT - 1, idx));
}

export function slotColor(mult: number): string {
  if (mult >= 5) return "#c4a7e7";
  if (mult >= 2) return "#f6c177";
  if (mult >= 1) return "#9ccfd8";
  return "#eb6f92";
}

export type PachinkoUiResult = {
  net: number;
  label: string;
  tone: "jackpot" | "win" | "lose" | "chance";
};

export function formatPachinkoResultLabel(label: string, net: number): string {
  return net >= 0 ? `${label} · итого +${net}` : `${label} · итого ${net}`;
}

export function getPachinkoResultColor(result: PachinkoUiResult | null): string {
  if (!result) return "";
  if (result.net > 0) {
    if (result.tone === "jackpot") return "text-amber-400";
    return "text-emerald-400";
  }
  if (result.net < 0) return "text-red-400";
  return "text-muted";
}

export function randomDropOffsetX(): number {
  return (Math.random() - 0.5) * 0.75;
}
