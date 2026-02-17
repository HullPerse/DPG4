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
