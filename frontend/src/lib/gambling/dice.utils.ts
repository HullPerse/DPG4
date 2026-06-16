import { CanvasTexture } from "three";
import type { DiceSim } from "@/types/gamble";

export const REST_Y = 0.8;
export const GRAVITY = 18;
export const BROKEN_GRAVITY = 10;
export const MIN_AIR_TIME = 1.0;
export const MAX_AIR_TIME = 7;
export const MIN_BOUNCES_BEFORE_SETTLE = 3;
export const DEALER_Z = -2.2;
export const PLAYER_Z = 1.5;
export const DICE_SETTLE_HOLD_MS = 700;
export const DICE_REROLL_PAUSE_MS = 600;
export const DICE_PLAYER_AUTO_MS = 1500;
export const BROKEN_SPLIT_DELAY = 0.4;
export const BROKEN_SPLIT_DURATION = 0.9;
export const BROKEN_HALF_OFFSET = 1.5;

export const FACE_VALUES = [4, 3, 1, 6, 2, 5] as const;

export const TARGET_ROTATION: Record<number, [number, number, number]> = {
  1: [0, 0, 0],
  2: [-Math.PI / 2, 0, 0],
  3: [0, 0, -Math.PI / 2],
  4: [0, 0, Math.PI / 2],
  5: [Math.PI / 2, 0, 0],
  6: [Math.PI, 0, 0],
};

export const JACKPOT_YEARS = 5;
export const THREE_OF_KIND_MULT = 3;
export const STRAIGHT_MULT = 2;
export const PAIR_MULT = 1;
export const PINCH_MULT = 2;

export const HAND_JP: Record<string, string> = {
  "1·1·1 - джекпот": "ピンゾロ",
  "Нет комбинации - переброс": "役無し",
  "Нет комбинации": "役無し",
  "4·5·6": "シゴロ",
  "1·2·3": "ピンチ",
};

export function getHandJp(label: string): string {
  return HAND_JP[label] ?? "";
}

export function createInnerFaceTexture(): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 200; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = 1 + Math.random() * 3;
    const bright = 20 + Math.floor(Math.random() * 20);
    ctx.fillStyle = `rgb(${bright + 5}, ${bright}, ${bright})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new CanvasTexture(canvas);
  texture.anisotropy = 4;
  return texture;
}

export function createDiceFaceTexture(value: number): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = "#0f0f1a";
  ctx.fillRect(8, 8, 240, 240);

  ctx.fillStyle = "#e8e0d0";
  const dot = (x: number, y: number, r = 15) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#d4caba";
    ctx.beginPath();
    ctx.arc(x - 2, y - 2, r * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e8e0d0";
  };

  const c = 128;
  const dots: Record<number, [number, number][]> = {
    1: [[c, c]],
    2: [[192, 64], [64, 192]],
    3: [[192, 64], [128, 128], [64, 192]],
    4: [[64, 64], [192, 64], [64, 192], [192, 192]],
    5: [[64, 64], [192, 64], [128, 128], [64, 192], [192, 192]],
    6: [[64, 64], [192, 64], [64, 128], [192, 128], [64, 192], [192, 192]],
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

export function createThrowSim(index: number, now: number, homeZ = 0): DiceSim {
  const homeX = (index - 1) * 2.4;
  const spread = (Math.random() - 0.5) * 0.8;

  return {
    phase: "flying",
    homeX,
    homeZ,
    throwStart: now,
    settleStart: 0,
    bounceCount: 0,
    pos: {
      x: homeX + spread * 0.4,
      y: 4.2 + Math.random() * 1.5,
      z: homeZ - 5 - Math.random() * 1.5,
    },
    vel: {
      x: (homeX - spread) * 0.3 + (Math.random() - 0.5) * 1.8,
      y: 5 + Math.random() * 3,
      z: 6 + Math.random() * 2.5,
    },
    rot: {
      x: Math.random() * Math.PI * 2,
      y: Math.random() * Math.PI * 2,
      z: Math.random() * Math.PI * 2,
    },
    angVel: {
      x: (Math.random() - 0.5) * 14,
      y: (Math.random() - 0.5) * 14,
      z: (Math.random() - 0.5) * 14,
    },
  };
}

export function createBrokenThrowSim(index: number, now: number, homeZ = 0): DiceSim {
  const homeX = (index - 1) * 2.4;
  const spread = (Math.random() - 0.5) * 0.6;

  return {
    phase: "flying",
    homeX,
    homeZ,
    throwStart: now,
    settleStart: 0,
    bounceCount: 0,
    pos: {
      x: homeX + spread * 0.3,
      y: 5.5 + Math.random() * 2.5,
      z: homeZ - 6 - Math.random() * 2,
    },
    vel: {
      x: (homeX - spread) * 0.25 + (Math.random() - 0.5) * 2.5,
      y: 7 + Math.random() * 4,
      z: 7 + Math.random() * 3,
    },
    rot: {
      x: Math.random() * Math.PI * 2,
      y: Math.random() * Math.PI * 2,
      z: Math.random() * Math.PI * 2,
    },
    angVel: {
      x: (Math.random() - 0.5) * 30,
      y: (Math.random() - 0.5) * 30,
      z: (Math.random() - 0.5) * 30,
    },
  };
}

export function createIdleSim(index: number, homeZ = 0): DiceSim {
  const homeX = (index - 1) * 2.4;
  return {
    phase: "idle",
    homeX,
    homeZ,
    throwStart: 0,
    settleStart: 0,
    bounceCount: 0,
    pos: { x: homeX, y: REST_Y, z: homeZ },
    vel: { x: 0, y: 0, z: 0 },
    rot: { x: 0.25, y: 0.35 + index * 0.4, z: 0 },
    angVel: { x: 0, y: 0, z: 0 },
  };
}
