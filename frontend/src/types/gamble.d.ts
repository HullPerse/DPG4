export type DicePhase = "idle" | "flying" | "settle" | "done";

export interface DiceSim {
  phase: DicePhase;
  pos: { x: number; y: number; z: number };
  vel: { x: number; y: number; z: number };
  rot: { x: number; y: number; z: number };
  angVel: { x: number; y: number; z: number };
  homeX: number;
  throwStart: number;
  settleStart: number;
  bounceCount: number;
}

export type DiceRevealed = [number | null, number | null, number | null];
export type DicePending = [number, number, number] | null;
export type DiceResult = {
  net: number;
  label: string;
  tone: "jackpot" | "win" | "lose" | "chance";
} | null;
