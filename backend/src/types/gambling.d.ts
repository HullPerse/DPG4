export type Suit = "hearts" | "diamonds" | "clubs" | "spades";
export type Rank =
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

export interface Card {
  suit: Suit;
  rank: Rank;
}

interface ActiveGame {
  userId: string;
  bid: number;
  deck: Card[];
  playerHand: Card[];
  dealerHand: Card[];
  phase: "player" | "ended";
}

export interface BlackjackResult {
  outcome: "blackjack" | "win" | "lose" | "push";
  payout: number;
  net: number;
  label: string;
  tone: "jackpot" | "win" | "lose" | "chance";
  banned: boolean;
}

export interface BlackjackState {
  phase: "player" | "ended";
  playerHand: Card[];
  dealerHand: Card[];
  dealerHoleHidden: boolean;
  playerValue: number;
  dealerValue: number | null;
  bid: number;
  balance: number;
  result: BlackjackResult | null;
}

export interface DiceResult {
  payout: number;
  label: string;
  tone: "jackpot" | "win" | "lose" | "chance";
}

export type RocketPhase = "idle" | "launching" | "flying" | "crashed" | "cashed";

export interface ActiveRocketGame {
  userId: string;
  bid: number;
  crashPoint: number;
  launchedAt: number;
  cashedOut: boolean;
  cashoutMultiplier: number | null;
}

export interface RocketResult {
  net: number;
  label: string;
  tone: "jackpot" | "win" | "lose" | "chance";
  banned: boolean;
}

export interface RocketState {
  phase: RocketPhase;
  multiplier: number;
  crashPoint: number;
  bid: number;
  balance: number;
  net: number;
  label: string;
  tone: "jackpot" | "win" | "lose" | "chance" | "";
  banned: boolean;
}

export type PachinkoPhase = "idle" | "dropping" | "done";

export interface PachinkoState {
  phase: PachinkoPhase;
  bid: number;
  balance: number;
  slotIndex: number | null;
  multiplier: number;
  payout: number;
  net: number;
  label: string;
  tone: "jackpot" | "win" | "lose" | "chance" | "";
  banned: boolean;
}
