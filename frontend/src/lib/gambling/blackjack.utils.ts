import type { PlayingCard, BlackjackUiResult } from "@/types/gamble";
import { CanvasTexture } from "three";

const SUIT_SYMBOL: Record<PlayingCard["suit"], string> = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠",
};

const textureCache = new Map<string, CanvasTexture>();

function isRed(suit: PlayingCard["suit"]) {
  return suit === "hearts" || suit === "diamonds";
}

export function cardLabel(card: PlayingCard): string {
  return `${card.rank}${SUIT_SYMBOL[card.suit]}`;
}

export function createCardTexture(card: PlayingCard | "back"): CanvasTexture {
  const key = card === "back" ? "back" : `${card.rank}-${card.suit}`;
  const cached = textureCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 360;
  const ctx = canvas.getContext("2d")!;

  if (card === "back") {
    ctx.fillStyle = "#232136";
    ctx.fillRect(0, 0, 256, 360);
    ctx.fillStyle = "#191724";
    ctx.fillRect(12, 12, 232, 336);
    ctx.strokeStyle = "#f6c177";
    ctx.lineWidth = 4;
    ctx.strokeRect(24, 24, 208, 312);
    ctx.fillStyle = "#c4a7e7";
    ctx.font = "bold 48px serif";
    ctx.textAlign = "center";
    ctx.fillText("♣", 128, 200);
  } else {
    ctx.fillStyle = "#e0def4";
    ctx.fillRect(0, 0, 256, 360);
    ctx.fillStyle = "#232136";
    ctx.fillRect(8, 8, 240, 344);

    const color = isRed(card.suit) ? "#eb6f92" : "#e0def4";
    ctx.fillStyle = color;
    ctx.font = "bold 72px serif";
    ctx.textAlign = "center";
    ctx.fillText(SUIT_SYMBOL[card.suit], 128, 200);

    ctx.font = "bold 44px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(card.rank, 28, 56);
    ctx.textAlign = "right";
    ctx.fillText(card.rank, 228, 340);
  }

  const texture = new CanvasTexture(canvas);
  texture.anisotropy = 4;
  textureCache.set(key, texture);
  return texture;
}

export function getCardSlot(
  side: "player" | "dealer",
  index: number,
  total: number,
): [number, number, number] {
  const spread = 1.05;
  const startX = (-(total - 1) * spread) / 2;
  const x = startX + index * spread;
  const z = side === "player" ? 1.35 : -1.35;
  return [x, 0.85, z];
}

export const DECK_POSITION: [number, number, number] = [3.2, 1.1, -2.2];

export function rules(bid: number) {
  return [
    { text: "Блэкджек (21)", result: `+${Math.floor(bid * 1.5)}` },
    { text: "Победа", result: `+${bid}` },
    { text: "Ничья", result: "0" },
    { text: "Проигрыш / перебор", result: `−${bid}` },
    { text: "Дилер", result: "берёт до 17" },
    { text: "Колод", result: "6 (перетасовка)" },
  ];
}

export const getBlackjackResultColor = (result: BlackjackUiResult) => {
  if (!result) return "";
  if (result.net > 0) {
    if (result.tone === "jackpot") return "text-amber-400";
    return "text-emerald-400";
  }
  if (result.net < 0) return "text-red-400";
  return "text-white";
};

export function animDelayMs(cardCount: number) {
  return 400 + cardCount * 130;
}
