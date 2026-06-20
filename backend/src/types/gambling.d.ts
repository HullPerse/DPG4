export type Suit = "hearts" | "diamonds" | "clubs" | "spades";
export type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";

export interface Card { suit: Suit; rank: Rank; }

export interface BlackjackResult {
  outcome: "blackjack" | "win" | "lose" | "push";
  payout: number; net: number; label: string;
  tone: "jackpot" | "win" | "lose" | "chance";
  banned: boolean;
}

export interface BlackjackState {
  phase: "player" | "ended";
  playerHand: Card[]; dealerHand: Card[];
  dealerHoleHidden: boolean;
  playerValue: number; dealerValue: number | null;
  bid: number; balance: number;
  result: BlackjackResult | null;
}

export interface HandInfo { rank: 5 | 4 | 3 | 2 | 1 | 0; mult: number; kicker?: number; label: string; }

export interface ActiveDiceGame {
  dealerValues: [number, number, number];
  dealerHandInfo: HandInfo;
  phase: "dealer" | "player";
  bid: number; userId: string;
  dealerRerolls: number; playerRerolls: number;
  broken?: boolean; brokenDieIndex?: number;
}

export interface DiceRollPhaseResult {
  phase: "dealer";
  values: [number, number, number];
  reroll?: boolean; handLabel?: string;
  broken?: boolean; brokenDieIndex?: number;
}

export interface DiceGameResult {
  playerValues: [number, number, number];
  payout: number; net: number; label: string;
  tone: "jackpot" | "win" | "lose" | "chance" | "reroll";
  balance: number; banned: boolean;
  reroll?: boolean; broken?: boolean; brokenDieIndex?: number;
}

export type RocketPhase = "idle" | "launching" | "flying" | "crashed" | "cashed";

export interface ActiveRocketGame {
  userId: string; bid: number; crashPoint: number;
  launchedAt: number; cashedOut: boolean;
  cashoutMultiplier: number | null;
}

export interface RocketState {
  phase: RocketPhase;
  multiplier: number; crashPoint: number;
  bid: number; balance: number;
  net: number; label: string;
  tone: "jackpot" | "win" | "lose" | "chance" | "";
  banned: boolean;
}

export type PachinkoPhase = "idle" | "dropping" | "done";

export interface PachinkoState {
  phase: PachinkoPhase; bid: number; balance: number;
  slotIndex: number | null; multiplier: number;
  payout: number; net: number; label: string;
  tone: "jackpot" | "win" | "lose" | "chance" | "";
  banned: boolean; kickAvailable: boolean;
}

export interface ActiveMinesGame {
  userId: string; bid: number; mineCount: number;
  grid: boolean[][]; revealed: boolean[][];
  revealedCount: number; phase: "playing" | "won" | "lost";
}

export interface MinesRevealResult {
  phase: "playing" | "won" | "lost";
  x: number; y: number; isMine: boolean;
  currentMultiplier: number;
  revealed: boolean[][];
  minePositions?: [number, number][];
  payout: number; net: number; label: string;
  tone: "jackpot" | "win" | "lose" | "chance" | "";
  balance: number; banned: boolean;
}

export interface CellPath { number: number; ladderTo?: number; snakeTo?: number; }

export interface ActivePachinkoGame { userId: string; bid: number; ratAmount: number; droppedAt: number; }

export interface ActiveGame {
  userId: string; bid: number; deck: Card[];
  playerHand: Card[]; dealerHand: Card[];
  phase: "player" | "ended";
}

export interface DiceDevOverrides {
  devForceBreak?: boolean;
  devForceBreakDieIndex?: number;
  devForceDealerValues?: [number, number, number];
  devForcePlayerValues?: [number, number, number];
}

export interface BlackjackDevOverrides {
  devForceDealerCards?: Card[];
  devForcePlayerCards?: Card[];
  devForceHitCard?: Card[];
  devPeekHole?: boolean;
}

export interface PachinkoDevOverrides {
  devForceSlots?: number[];
  devShowMultipliers?: boolean;
}

export interface RocketDevOverrides {
  devForceCrashPoint?: number;
  devShowCrashPoint?: boolean;
}

export interface MinesDevOverrides {
  devShowMines?: boolean;
  devForceAllSafe?: boolean;
}

export interface JackpotDevOverrides { devForceWin?: boolean; devShowWinningNumber?: boolean; }