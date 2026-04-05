import { GameStatus } from "@/types/games";
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
  if (isNaN(realTime) || isNaN(hltbTime)) return 0;

  const score = realTime * (1 + 0.2 * (1 - realTime / hltbTime));
  return Math.round(score);
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
    COMPLETED: "green",
    PLAYING: "yellow",
    DROPPED: "red",
    REROLLED: "blue",
  };
  return colorMap[status as keyof typeof colorMap] ?? "yellow";
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
