import { GameStatus } from "@/types/games";
import { User } from "@/types/user";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { Update } from "@tauri-apps/plugin-updater";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 *
 * @param realTime time in hours user spent playing the game
 * @param hltbTime time in hours from https://howlongtobeat.com
 * @description this score calculation function will reward players to not speedrun games, but keeping an option to speedrun if user really wants to, since speedrunners will have a much sooner dice throw
 */
export function calculateScore(realTime: number, hltbTime: number) {
  if (isNaN(realTime) || isNaN(hltbTime) || hltbTime <= 0) return 3;

  const ratio = realTime / hltbTime;
  const multiplier = Math.max(0.5, Math.min(1.5, 0.5 + 0.5 * ratio));

  const score = multiplier * hltbTime;
  return Math.max(3, Math.floor(score));
}

/**
 * @description this cost calculation finction will return the cost of the item roll depending on user progress around the map
 */
export function calculateCost(): number {
  const BASE_VALUE = 3;

  return BASE_VALUE;
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

export function colorToHex(color: string) {
  const colorArray = {
    aliceblue: "#f0f8ff",
    antiquewhite: "#faebd7",
    aqua: "#00ffff",
    aquamarine: "#7fffd4",
    azure: "#f0ffff",
    beige: "#f5f5dc",
    bisque: "#ffe4c4",
    black: "#000000",
    blanchedalmond: "#ffebcd",
    blue: "#0000ff",
    blueviolet: "#8a2be2",
    brown: "#a52a2a",
    burlywood: "#deb887",
    cadetblue: "#5f9ea0",
    chartreuse: "#7fff00",
    chocolate: "#d2691e",
    coral: "#ff7f50",
    cornflowerblue: "#6495ed",
    cornsilk: "#fff8dc",
    crimson: "#dc143c",
    cyan: "#00ffff",
    darkblue: "#00008b",
    darkcyan: "#008b8b",
    darkgoldenrod: "#b8860b",
    darkgray: "#a9a9a9",
    darkgreen: "#006400",
    darkkhaki: "#bdb76b",
    darkmagenta: "#8b008b",
    darkolivegreen: "#556b2f",
    darkorange: "#ff8c00",
    darkorchid: "#9932cc",
    darkred: "#8b0000",
    darksalmon: "#e9967a",
    darkseagreen: "#8fbc8f",
    darkslateblue: "#483d8b",
    darkslategray: "#2f4f4f",
    darkturquoise: "#00ced1",
    darkviolet: "#9400d3",
    deeppink: "#ff1493",
    deepskyblue: "#00bfff",
    dimgray: "#696969",
    dodgerblue: "#1e90ff",
    firebrick: "#b22222",
    floralwhite: "#fffaf0",
    forestgreen: "#228b22",
    fuchsia: "#ff00ff",
    gainsboro: "#dcdcdc",
    ghostwhite: "#f8f8ff",
    gold: "#ffd700",
    goldenrod: "#daa520",
    gray: "#808080",
    green: "#008000",
    greenyellow: "#adff2f",
    honeydew: "#f0fff0",
    hotpink: "#ff69b4",
    "indianred ": "#cd5c5c",
    indigo: "#4b0082",
    ivory: "#fffff0",
    khaki: "#f0e68c",
    lavender: "#e6e6fa",
    lavenderblush: "#fff0f5",
    lawngreen: "#7cfc00",
    lemonchiffon: "#fffacd",
    lightblue: "#add8e6",
    lightcoral: "#f08080",
    lightcyan: "#e0ffff",
    lightgoldenrodyellow: "#fafad2",
    lightgrey: "#d3d3d3",
    lightgreen: "#90ee90",
    lightpink: "#ffb6c1",
    lightsalmon: "#ffa07a",
    lightseagreen: "#20b2aa",
    lightskyblue: "#87cefa",
    lightslategray: "#778899",
    lightsteelblue: "#b0c4de",
    lightyellow: "#ffffe0",
    lime: "#00ff00",
    limegreen: "#32cd32",
    linen: "#faf0e6",
    magenta: "#ff00ff",
    maroon: "#800000",
    mediumaquamarine: "#66cdaa",
    mediumblue: "#0000cd",
    mediumorchid: "#ba55d3",
    mediumpurple: "#9370d8",
    mediumseagreen: "#3cb371",
    mediumslateblue: "#7b68ee",
    mediumspringgreen: "#00fa9a",
    mediumturquoise: "#48d1cc",
    mediumvioletred: "#c71585",
    midnightblue: "#191970",
    mintcream: "#f5fffa",
    mistyrose: "#ffe4e1",
    moccasin: "#ffe4b5",
    navajowhite: "#ffdead",
    navy: "#000080",
    oldlace: "#fdf5e6",
    olive: "#808000",
    olivedrab: "#6b8e23",
    orange: "#ffa500",
    orangered: "#ff4500",
    orchid: "#da70d6",
    palegoldenrod: "#eee8aa",
    palegreen: "#98fb98",
    paleturquoise: "#afeeee",
    palevioletred: "#d87093",
    papayawhip: "#ffefd5",
    peachpuff: "#ffdab9",
    peru: "#cd853f",
    pink: "#ffc0cb",
    plum: "#dda0dd",
    powderblue: "#b0e0e6",
    purple: "#800080",
    rebeccapurple: "#663399",
    red: "#ff0000",
    rosybrown: "#bc8f8f",
    royalblue: "#4169e1",
    saddlebrown: "#8b4513",
    salmon: "#fa8072",
    sandybrown: "#f4a460",
    seagreen: "#2e8b57",
    seashell: "#fff5ee",
    sienna: "#a0522d",
    silver: "#c0c0c0",
    skyblue: "#87ceeb",
    slateblue: "#6a5acd",
    slategray: "#708090",
    snow: "#fffafa",
    springgreen: "#00ff7f",
    steelblue: "#4682b4",
    tan: "#d2b48c",
    teal: "#008080",
    thistle: "#d8bfd8",
    tomato: "#ff6347",
    turquoise: "#40e0d0",
    violet: "#ee82ee",
    wheat: "#f5deb3",
    white: "#ffffff",
    whitesmoke: "#f5f5f5",
    yellow: "#ffff00",
    yellowgreen: "#9acd32",
  };

  return colorArray[color.toLowerCase() as keyof typeof colorArray];
}

export const highlightText = (text: string, query: string) => {
  if (!query) return text;
  const regex = new RegExp(
    `(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
    "gi",
  );

  return text.split(regex).map((part, index) => {
    if (!regex.test(part)) return part;
    return (
      <span
        key={index}
        className="bg-amber-500/20 text-white rounded font-bold"
      >
        {part}
      </span>
    );
  });
};

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function getNextDice(
  realTime: number,
  currentCell: number,
  action: "MOVE_POSITIVE" | "MOVE_NEGATIVE",
): number {
  if (action === "MOVE_NEGATIVE") {
    if (currentCell >= 81) return 2;
    return 1;
  }

  if (currentCell >= 81) return 1;

  if (realTime <= 4) return 1;
  if (realTime <= 10) return 1;
  if (realTime <= 16) return 2;
  if (realTime <= 24) return 2;
  if (realTime <= 40) return 3;
  return 4;
}

export async function fileFromUrl(url: string): Promise<File> {
  return fetch(url)
    .then((response) => response.blob())
    .then((blob) => new File([blob], "image.png", { type: blob.type }));
}

export function downloadJSON(json: object[]) {
  const blob = new Blob([JSON.stringify(json)], {
    type: "application/json",
  });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "items.json";

  link.click();

  URL.revokeObjectURL(link.href);
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
