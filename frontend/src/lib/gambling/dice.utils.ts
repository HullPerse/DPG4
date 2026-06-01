import { CanvasTexture } from "three";
import type { DiceResult, DiceSim } from "@/types/gamble";

export const REST_Y = 0.8;
export const GRAVITY = 22;
export const STAGGER_S = 0.65;
export const MIN_AIR_TIME = 0.55;

// +x, -x, +y, -y, +z, -z
export const FACE_VALUES = [4, 3, 1, 6, 2, 5] as const;

export const TARGET_ROTATION: Record<number, [number, number, number]> = {
  1: [0, 0, 0],
  2: [-Math.PI / 2, 0, 0],
  3: [0, 0, -Math.PI / 2],
  4: [0, 0, Math.PI / 2],
  5: [Math.PI / 2, 0, 0],
  6: [Math.PI, 0, 0],
};

export function createDiceFaceTexture(value: number): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#232136";
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = "#191724";
  ctx.fillRect(8, 8, 240, 240);

  ctx.fillStyle = "#f6c177";
  const dot = (x: number, y: number, r = 16) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };

  const c = 128;
  const dots: Record<number, [number, number][]> = {
    1: [[c, c]],
    2: [
      [192, 64],
      [64, 192],
    ],
    3: [
      [192, 64],
      [128, 128],
      [64, 192],
    ],
    4: [
      [64, 64],
      [192, 64],
      [64, 192],
      [192, 192],
    ],
    5: [
      [64, 64],
      [192, 64],
      [128, 128],
      [64, 192],
      [192, 192],
    ],
    6: [
      [64, 64],
      [192, 64],
      [64, 128],
      [192, 128],
      [64, 192],
      [192, 192],
    ],
  };

  dots[value].forEach(([x, y]) => dot(x, y));
  const texture = new CanvasTexture(canvas);
  texture.anisotropy = 4;
  return texture;
}

export function lerpAngle(a: number, b: number, t: number) {
  let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

export function createThrowSim(index: number, now: number): DiceSim {
  const homeX = (index - 1) * 2.4;
  const spread = (Math.random() - 0.5) * 1.2;

  return {
    phase: "flying",
    homeX,
    throwStart: now,
    settleStart: 0,
    bounceCount: 0,
    pos: {
      x: homeX + spread * 0.4,
      y: 3.8 + Math.random() * 1.2,
      z: -4.2 - Math.random() * 1.5,
    },
    vel: {
      x: (homeX - spread) * 0.35 + (Math.random() - 0.5) * 2.2,
      y: 4.5 + Math.random() * 2.5,
      z: 5.5 + Math.random() * 2,
    },
    rot: {
      x: Math.random() * Math.PI * 2,
      y: Math.random() * Math.PI * 2,
      z: Math.random() * Math.PI * 2,
    },
    angVel: {
      x: (Math.random() - 0.5) * 16,
      y: (Math.random() - 0.5) * 16,
      z: (Math.random() - 0.5) * 16,
    },
  };
}

export function createIdleSim(index: number): DiceSim {
  const homeX = (index - 1) * 2.4;
  return {
    phase: "idle",
    homeX,
    throwStart: 0,
    settleStart: 0,
    bounceCount: 0,
    pos: { x: homeX, y: REST_Y, z: 0 },
    vel: { x: 0, y: 0, z: 0 },
    rot: { x: 0.25, y: 0.35 + index * 0.4, z: 0 },
    angVel: { x: 0, y: 0, z: 0 },
  };
}

export const getResultColor = (result: DiceResult) => {
  if (!result) return "";

  if (result.net > 0) {
    if (result.tone === "jackpot") return "text-amber-400";
    else return "text-emerald-400";
  } else if (result.net < 0) return "text-red-400";
  else return "text-muted";
};
