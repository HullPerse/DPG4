export type DicePhase = "idle" | "flying" | "settle" | "done";

export interface DiceSim {
  phase: DicePhase;
  pos: { x: number; y: number; z: number };
  vel: { x: number; y: number; z: number };
  rot: { x: number; y: number; z: number };
  angVel: { x: number; y: number; z: number };
  homeX: number;
  throwStart: number;
  settleStart: number;
  bounceCount: number;
}

export type DiceRevealed = [number | null, number | null, number | null];
export type DicePending = [number, number, number] | null;
export type DiceResult = {
  net: number;
  label: string;
  tone: "jackpot" | "win" | "lose" | "chance";
} | null;

export type CardSuit = "hearts" | "diamonds" | "clubs" | "spades";
export type CardRank =
  | "A"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K";

export interface PlayingCard {
  suit: CardSuit;
  rank: CardRank;
}

export interface BlackjackGameResult {
  outcome: "blackjack" | "win" | "lose" | "push";
  payout: number;
  net: number;
  label: string;
  tone: "jackpot" | "win" | "lose" | "chance";
  banned: boolean;
}

export interface BlackjackState {
  phase: "player" | "ended";
  playerHand: PlayingCard[];
  dealerHand: PlayingCard[];
  dealerHoleHidden: boolean;
  playerValue: number;
  dealerValue: number | null;
  bid: number;
  balance: number;
  result: BlackjackGameResult | null;
}

export type BlackjackUiResult = {
  net: number;
  label: string;
  tone: "jackpot" | "win" | "lose" | "chance";
} | null;
