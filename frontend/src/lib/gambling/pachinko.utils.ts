/** Mirrors backend pachinko.service.ts - left → right */
export const PACHINKO_SLOT_MULTIPLIERS = [
  5, 3, 2, 1.5, 1, 0.5, 0.5, 0.5, 1, 1.5, 2, 3, 5,
] as const;

export const PACHINKO_SLOT_COUNT = PACHINKO_SLOT_MULTIPLIERS.length;

export const BOARD_WIDTH = 13;

/** Variable slot widths: inversely proportional to multiplier (sqrt of inverse).
 *  0.5x → widest, 5x → narrowest. Normalized to sum to BOARD_WIDTH. */
const _rawWidths = PACHINKO_SLOT_MULTIPLIERS.map((m) => Math.sqrt(1 / m));
const _rawSum = _rawWidths.reduce((a, b) => a + b, 0);
export const PACHINKO_SLOT_WIDTHS: number[] = _rawWidths.map(
  (w) => (w / _rawSum) * BOARD_WIDTH,
);

/** Left-edge X position of each slot (cumulative from -BOARD_HALF). */
export const PACHINKO_SLOT_EDGES: number[] = (() => {
  const edges: number[] = [];
  let x = -BOARD_WIDTH / 2;
  for (const w of PACHINKO_SLOT_WIDTHS) {
    edges.push(x);
    x += w;
  }
  return edges;
})();

export function slotCenterX(index: number): number {
  return PACHINKO_SLOT_EDGES[index] + PACHINKO_SLOT_WIDTHS[index] / 2;
}

export function slotIndexFromX(x: number): number {
  if (!Number.isFinite(x)) return Math.floor(PACHINKO_SLOT_COUNT / 2);
  for (let i = 0; i < PACHINKO_SLOT_COUNT; i++) {
    if (x < PACHINKO_SLOT_EDGES[i] + PACHINKO_SLOT_WIDTHS[i]) return i;
  }
  return PACHINKO_SLOT_COUNT - 1;
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

export function getPachinkoResultColor(
  result: PachinkoUiResult | null,
): string {
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
