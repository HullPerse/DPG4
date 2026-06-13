export type DicePhase = "idle" | "flying" | "settle" | "done";

export interface DiceSim {
  phase: DicePhase;
  pos: { x: number; y: number; z: number };
  vel: { x: number; y: number; z: number };
  rot: { x: number; y: number; z: number };
  angVel: { x: number; y: number; z: number };
  homeX: number;
  homeZ: number;
  throwStart: number;
  settleStart: number;
  bounceCount: number;
}

export type DiceRevealed = [number | null, number | null, number | null];
export type DicePending = [number, number, number] | null;
export type DiceResult = {
  net: number;
  label: string;
  tone: "jackpot" | "win" | "lose" | "chance" | "reroll";
  reroll?: boolean;
} | null;

export interface DiceDealerResult {
  phase: "dealer";
  values: [number, number, number];
  reroll?: boolean;
  handLabel?: string;
}

export interface DiceGameResult {
  playerValues: [number, number, number];
  payout: number;
  net: number;
  label: string;
  tone: "jackpot" | "win" | "lose" | "chance" | "reroll";
  balance: number;
  banned: boolean;
  reroll?: boolean;
}

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

export interface GamblingConfig {
  banThreshold: number;
  minBet: number;
  maxBet: number;
  bidOptions: number[];
  rerollPrice: number;
  spinCost: number;
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

export type RocketPhase = "idle" | "launching" | "flying" | "crashed" | "cashed";

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

export interface RocketHistoryEntry {
  crashPoint: number;
  timestamp: number;
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
  kickAvailable: boolean;
}

export interface MinesState {
  phase: "playing" | "won" | "lost";
  x: number;
  y: number;
  isMine: boolean;
  currentMultiplier: number;
  revealed: boolean[][];
  minePositions?: [number, number][];
  payout: number;
  net: number;
  label: string;
  tone: "win" | "lose" | "chance" | "";
  balance: number;
  banned: boolean;
}

