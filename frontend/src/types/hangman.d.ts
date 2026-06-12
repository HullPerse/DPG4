export interface HangmanRecord {
  id: string;
  userId: string;
  word: string;
  state: "current" | "won" | "lost";
  guessedLetters: string[];
  wrongLetters: string[];
  created: string;
  updated: string;
}
