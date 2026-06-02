import type { RocketPhase } from "@/types/gamble";

/** Mirrors backend rocket.service.ts computeMultiplier */
export function computeMultiplier(elapsedMs: number): number {
  const t = elapsedMs / 1000;
  return Math.max(1, Math.floor((1 + 0.08 * t + 0.02 * t * t) * 100) / 100);
}

export function multiplierColor(mult: number): string {
  if (mult < 2) return "#3e8fb0";
  if (mult < 5) return "#f6c177";
  if (mult < 10) return "#eb6f92";
  return "#c4a7e7";
}

export function elapsedFromMultiplier(multiplier: number): number {
  const target = Math.max(1, multiplier);
  let lo = 0;
  let hi = 120_000;
  while (hi - lo > 50) {
    const mid = (lo + hi) / 2;
    if (computeMultiplier(mid) < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export function potentialPayout(bid: number, multiplier: number): number {
  return Math.floor(bid * multiplier);
}

export function potentialNet(bid: number, multiplier: number): number {
  return potentialPayout(bid, multiplier) - bid;
}

export function isActivePhase(phase: RocketPhase): boolean {
  return phase === "launching" || phase === "flying";
}

export function liveMultiplier(
  phase: RocketPhase,
  flightStart: number | null,
  serverMult: number,
): number {
  if (isActivePhase(phase) && flightStart) {
    return computeMultiplier(Date.now() - flightStart);
  }
  return serverMult || 1;
}

export type RocketUiResult = {
  net: number;
  label: string;
  tone: "jackpot" | "win" | "lose" | "chance" | "";
};

export function formatRocketResultLabel(label: string, net: number): string {
  return net >= 0 ? `${label}` : `${label}`;
}

export function getRocketResultColor(result: RocketUiResult | null): string {
  if (!result) return "";
  if (result.net > 0) {
    if (result.tone === "jackpot") return "text-amber-400";
    return "text-emerald-400";
  }
  if (result.net < 0) return "text-red-400";
  return "text-muted";
}

export interface FlightPoint {
  t: number;
  mult: number;
  x: number;
  y: number;
}

export function buildFlightPath(
  elapsedMs: number,
  width: number,
  height: number,
  pad: number,
): { points: FlightPoint[]; maxT: number; maxM: number; tip: FlightPoint } {
  const elapsedSec = elapsedMs / 1000;
  const maxT = Math.max(elapsedSec + 3, 6);
  const currentMult = computeMultiplier(elapsedMs);
  const maxM = Math.max(currentMult * 1.25, 2.5);

  const steps = Math.max(40, Math.floor(elapsedSec * 30));
  const points: FlightPoint[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = (elapsedSec * i) / steps;
    const mult = computeMultiplier(t * 1000);
    const x = pad + (t / maxT) * (width - pad * 2);
    const y = height - pad - ((mult - 1) / (maxM - 1)) * (height - pad * 2);
    points.push({ t, mult, x, y });
  }

  const tip = points[points.length - 1] ?? {
    t: 0,
    mult: 1,
    x: pad,
    y: height - pad,
  };

  return { points, maxT, maxM, tip };
}
