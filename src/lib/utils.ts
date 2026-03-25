import { GameStatus } from "@/types/games";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 *
 * @param realTime
 * @param hltbTime
 * @description this score calculation function will reward players to not speedrun games, but it also is an option to speedrun or not, since speedrunners will have a much sooner dice throw
 */
export function calculateScore(realTime: number, hltbTime: number) {
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
    REROLL: "cyan",
  };
  return colorMap[status as keyof typeof colorMap] ?? "yellow";
}

export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*?v=([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = new RegExp(pattern).exec(url);
    if (match) {
      return match[1];
    }
  }

  return null;
}

export function isYouTubeLink(text: string): boolean {
  return /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)/.test(
    text,
  );
}

export function parseReviewText(text: string): Array<{
  type: "text" | "youtube";
  content: string;
  videoId?: string;
}> {
  const result: Array<{
    type: "text" | "youtube";
    content: string;
    videoId?: string;
  }> = [];

  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches: Array<{
    url: string;
    startIndex: number;
    endIndex: number;
  }> = [];

  for (const match of text.matchAll(urlRegex)) {
    if (isYouTubeLink(match[0])) {
      matches.push({
        url: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }
  }

  if (matches.length === 0) {
    result.push({ type: "text", content: text });
  } else {
    let lastIndex = 0;
    for (const urlMatch of matches) {
      if (urlMatch.startIndex > lastIndex) {
        result.push({
          type: "text",
          content: text.substring(lastIndex, urlMatch.startIndex),
        });
      }

      const videoId = extractYouTubeId(urlMatch.url);
      if (videoId) {
        result.push({
          type: "youtube",
          content: urlMatch.url,
          videoId,
        });
      } else {
        result.push({
          type: "text",
          content: urlMatch.url,
        });
      }

      lastIndex = urlMatch.endIndex;
    }

    if (lastIndex < text.length) {
      result.push({
        type: "text",
        content: text.substring(lastIndex),
      });
    }
  }

  return result;
}
