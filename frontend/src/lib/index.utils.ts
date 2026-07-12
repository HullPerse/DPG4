import { createElement } from "react";
import { GameStatus } from "@/types/games";
import { ItemType } from "@/types/items";
import { User } from "@/types/user";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { Update } from "@tauri-apps/plugin-updater";
import { type ClassValue, clsx } from "clsx";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { apiFetch } from "@/api/client.api";
import type { GamblingConfig } from "@/types/gamble";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const BORDER_WINDOW = "border-2 border-highlight-high";

let cachedConfig: GamblingConfig | null = null;

/** Server-side score calculation */
export async function calculateScore(realTime: number, hltbTime: number): Promise<number> {
  const res = await apiFetch<{ score: number }>(
    `/utils/calculate-score?realTime=${realTime}&hltbTime=${hltbTime}`,
    { auth: false },
  );
  return res.score;
}

/** Wheel spin cost from server */
export function calculateCostSync(): number {
  return cachedConfig?.spinCost ?? 2;
}

export function networkClass(connection: boolean) {
  if (connection) return "text-text";
  return "text-red-700";
}

export function selectionMouse(
  e: MouseEvent,
  desktopRef: React.RefObject<HTMLDivElement | null>,
  selectionRef: React.RefObject<HTMLDivElement | null>,
  selectionStartRef: React.RefObject<{ x: number; y: number }>,
) {
  const rect = desktopRef?.current?.getBoundingClientRect();
  if (!rect || !selectionRef.current) return;

  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const taskbarHeight = 56;
  const maxY = rect.height - taskbarHeight;

  const clampedX = Math.max(0, Math.min(x, rect.width));
  const clampedY = Math.max(0, Math.min(y, maxY));

  const startX = selectionStartRef.current.x;
  const startY = selectionStartRef.current.y;

  const left = Math.min(startX, clampedX);
  const top = Math.min(startY, clampedY);
  const width = Math.abs(clampedX - startX);
  const height = Math.abs(clampedY - startY);

  selectionRef.current.style.left = `${left}px`;
  selectionRef.current.style.top = `${top}px`;
  selectionRef.current.style.width = `${width}px`;
  selectionRef.current.style.height = `${height}px`;
}

export function getStatusColor(status: GameStatus) {
  if (!status) return "red";

  const colorMap = {
    COMPLETED: "#7FDA72",
    PLAYING: "#FFC94D",
    DROPPED: "#EC7676",
    REROLLED: "#77A8FF",
  };
  return colorMap[status as keyof typeof colorMap] ?? "#FFC94D";
}

export const highlightText = (text: string, query: string): React.ReactNode => {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
  const parts = text.split(urlRegex);

  if (parts.length === 1) {
    if (!query) return text;

    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escapedQuery})`, "gi");

    const result: React.ReactNode[] = [];
    text.split(regex).forEach((part, index) => {
      if (!part.match(regex)) {
        result.push(part);
      } else {
        result.push(
          createElement(
            "span",
            {
              key: index,
              className: "bg-amber-500/20 text-white font-bold",
            },
            part,
          ),
        );
      }
    });
    return result;
  }

  const urlMatches = text.match(urlRegex) || [];
  const result: React.ReactNode[] = [];

  parts.forEach((part, index) => {
    if (!query) {
      result.push(part);
    } else {
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(${escapedQuery})`, "gi");

      const subParts = part.split(regex);
      subParts.forEach((subPart, subIndex) => {
        if (!subPart.match(regex)) {
          result.push(subPart);
        } else {
          result.push(
            createElement(
              "span",
              {
                key: `${index}-${subIndex}`,
                className: "bg-amber-500/20 text-white font-bold",
              },
              subPart,
            ),
          );
        }
      });
    }

    if (index < urlMatches.length) {
      const url = urlMatches[index];
      result.push(
        createElement(
          "span",
          {
            key: `url-${index}`,
            className: "text-blue-500 underline hover:cursor-pointer",
            onClick: () => openWindow(`url-${Date.now()}`, url, "Ссылка"),
          },
          url,
        ),
      );
    }
  });

  return result;
};

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export async function fileFromUrl(url: string): Promise<File> {
  return fetch(url)
    .then((response) => response.blob())
    .then((blob) => new File([blob], "image.png", { type: blob.type }));
}

export function getPlaceColor(place: User["place"]) {
  const placeMap = {
    "1": "#FFD700",
    "2": "#C0C0C0",
    "3": "#CD7F32",
  };

  return placeMap[place as keyof typeof placeMap];
}

export function removeFirst(arr: string[], value: string): string[] {
  const index = arr.indexOf(value);
  return index === -1 ? arr : arr.filter((_, i) => i !== index);
}

export async function installUpdate(update: Update) {
  if (!update) return;
  try {
    await update.downloadAndInstall();
  } catch (e) {
    console.error("Failed to install update:", e);
  }
}

export async function checkForUpdates(): Promise<Update | null> {
  try {
    const { check } = await import("@tauri-apps/plugin-updater");
    const update = await check();
    return update ?? null;
  } catch (e) {
    console.debug("Auto-update check skipped:", e);
    return null;
  }
}

export function openWindow(id: string, url: string, title: string) {
  const win = new WebviewWindow(id, {
    url: url,
    title: title,
    focus: true,
  });

  win.once("tauri://error", (e) => {
    console.error("Failed to open window:", e);
  });
}

export function getAdPosition(position: 1 | 2 | 3 | 4) {
  const positionMap = {
    1: "top-2 right-2", //top right
    2: "bottom-2 right-2", //bottom right
    3: "bottom-2 left-2", //bottom left
    4: "top-2 left-2", //top left
  };

  return positionMap[position as keyof typeof positionMap];
}

export function getAdPositionIcon(position: 1 | 2 | 3 | 4) {
  const positionMap = {
    1: createElement(ChevronDown), //go bottom
    2: createElement(ChevronLeft), //go left
    3: createElement(ChevronUp), //go up
    4: createElement(ChevronRight), //go right
  };

  return positionMap[position as keyof typeof positionMap];
}

export function formatBytesToMB(bytes?: number | null): string {
  if (bytes === undefined || bytes === null || bytes <= 0) return "-";
  return (bytes / 1024 / 1024).toFixed(2);
}

export function translateItemType(type: ItemType) {
  const typeMap = {
    effect: "Эффект",
    item: "Предмет",
    roll: "Спецролл",
    other: "Другое",
    rat: "Крысиный",
    ticket: "Тикет",
  };

  return typeMap[type];
}

export function readFileAsDataUrl(
  file: File,
  onProgress?: (loadedRatio: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(event.loaded / event.total);
      }
    };

    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string" && result.startsWith("data:")) {
        resolve(result);
        return;
      }
      reject(new Error("Invalid image data"));
    };

    reader.onerror = () => {
      reject(reader.error ?? new Error("Failed to read file"));
    };

    reader.readAsDataURL(file);
  });
}


export function checkImage(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}


export function getMood(hunger: number, happiness: number, energy: number, isAlive: boolean): string {
  if (!isAlive) return "Мертва";
  if (hunger < 30) return "Голоден";
  if (energy < 30) return "Хочет спать";
  if (happiness < 30) return "Грустный";
  if (happiness > 70 && hunger > 70 && energy > 70) return "Счастлив";
  return "Нормально";
}
