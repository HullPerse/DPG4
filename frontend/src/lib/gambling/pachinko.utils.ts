import type { RiskGateChoice } from "@/types/gamble";

export const PACHINKO_SLOT_MULTIPLIERS = [
  5, 3, 2, 1.5, 1, 0.5, 0.5, 0.5, 1, 1.5, 2, 3, 5,
] as const;

export const PACHINKO_SLOT_COUNT = PACHINKO_SLOT_MULTIPLIERS.length;

export const BOARD_WIDTH = 17;

const AVG_M = 2;
const BID_SLOPE = 0.0007;

export function getSlotWidths(bid: number): number[] {
  const raw = PACHINKO_SLOT_MULTIPLIERS.map((m) => {
    const base = Math.sqrt(1 / m);
    const factor = 1 + (bid - 1) * BID_SLOPE * (AVG_M - m);
    return base * Math.max(0.5, factor);
  });
  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map((w) => (w / sum) * BOARD_WIDTH);
}

export function getSlotEdges(bid: number): number[] {
  const widths = getSlotWidths(bid);
  const edges: number[] = [];
  let x = -BOARD_WIDTH / 2;
  for (const w of widths) {
    edges.push(x);
    x += w;
  }
  return edges;
}

export function slotCenterX(index: number, bid: number): number {
  const edges = getSlotEdges(bid);
  const widths = getSlotWidths(bid);
  return edges[index] + widths[index] / 2;
}

export function slotIndexFromX(x: number, bid: number): number {
  if (!Number.isFinite(x)) return Math.floor(PACHINKO_SLOT_COUNT / 2);
  const edges = getSlotEdges(bid);
  const widths = getSlotWidths(bid);
  for (let i = 0; i < PACHINKO_SLOT_COUNT; i++) {
    if (x < edges[i] + widths[i]) return i;
  }
  return PACHINKO_SLOT_COUNT - 1;
}

export function slotColor(mult: number): string {
  if (mult >= 5) return "#c4a7e7";
  if (mult >= 2) return "#f6c177";
  if (mult >= 1) return "#9ccfd8";
  return "#eb6f92";
}

export function slotIndexColor(i: number): string {
  return slotColor(PACHINKO_SLOT_MULTIPLIERS[i]);
}

export type PachinkoUiResult = {
  net: number;
  label: string;
  tone: "jackpot" | "win" | "lose" | "chance";
};

export function formatPachinkoResultLabel(label: string, _net: number): string {
  return _net >= 0 ? label : label;
}

export function randomDropOffsetX(): number {
  return (Math.random() - 0.5) * 0.75;
}

export function getSideMultiplier(_bid: number, side: "left" | "right" | null, choice: RiskGateChoice): number[] {
  if (!side || !choice) return [...PACHINKO_SLOT_MULTIPLIERS] as unknown as number[];
  const boosted = [...PACHINKO_SLOT_MULTIPLIERS] as number[];
  const sideIndex = side === "left" ? 0 : 1;
  const isChosen = (side === "left" && choice === "left") || (side === "right" && choice === "right");

  if (isChosen) {
    for (let i = 0; i < boosted.length; i++) {
      boosted[i] = Math.round((boosted[i] + 1) * 10) / 10;
    }
  } else {
    const trapIdx = sideIndex === 0 ? 0 : boosted.length - 1;
    boosted[trapIdx] = 0;
  }
  return boosted;
}

export const RISK_GATE_THRESHOLD = 3;

export let zaText = "";
let zaInterval: ReturnType<typeof setInterval> | null = null;

export function startZawa(callback: (text: string) => void) {
  const chars = ["ザ", "ワ", "ゾ", "ズ", "ド", "バ", "ギ"];
  stopZawa();
  zaInterval = setInterval(() => {
    const len = 4 + Math.floor(Math.random() * 6);
    let t = "";
    for (let i = 0; i < len; i++) {
      t += chars[Math.floor(Math.random() * chars.length)];
    }
    callback(t);
  }, 120);
}

export function stopZawa() {
  if (zaInterval) {
    clearInterval(zaInterval);
    zaInterval = null;
  }
}
