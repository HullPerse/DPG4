import { apiFetch } from "./client.api";
import type { HangmanRecord } from "@/types/hangman";

export function getHangman(userId: string): Promise<HangmanRecord | null> {
  return apiFetch<HangmanRecord | null>(`/hangman/${userId}`);
}

export function joinHangman(userId: string): Promise<HangmanRecord> {
  return apiFetch<HangmanRecord>(`/hangman/${userId}`, { method: "POST" });
}

export function saveHangmanState(
  userId: string,
  guessedLetters: string[],
  wrongLetters: string[],
): Promise<HangmanRecord> {
  return apiFetch<HangmanRecord>(`/hangman/${userId}/state`, {
    method: "PATCH",
    body: { guessedLetters, wrongLetters },
  });
}

export function playHangman(
  userId: string,
  won: boolean,
  guessedLetters: string[],
  wrongLetters: string[],
): Promise<HangmanRecord> {
  return apiFetch<HangmanRecord>(`/hangman/${userId}/play`, {
    method: "POST",
    body: { won, guessedLetters, wrongLetters },
  });
}

export function getStreak(userId: string): Promise<number> {
  return apiFetch<{ streak: number }>(`/hangman/${userId}/streak`).then((res) =>
    Number(res),
  );
}
