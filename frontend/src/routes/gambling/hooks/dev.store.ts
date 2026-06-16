import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export interface DiceDevState {
  enabled: boolean;
  devForceBreak: boolean;
  devForceBreakDieIndex: number;
  devForceDealerValues: [number, number, number] | null;
  devForcePlayerValues: [number, number, number] | null;
}

export interface BlackjackDevState {
  enabled: boolean;
  devForceDealerCards: string | null;
  devForcePlayerCards: string | null;
  devForceHitCard: string | null;
  devPeekHole: boolean;
}

export interface RocketDevState {
  enabled: boolean;
  devForceCrashPoint: number | null;
  devShowCrashPoint: boolean;
}

export interface PachinkoDevState {
  enabled: boolean;
  devForceSlots: string | null;
  devShowMultipliers: boolean;
}

export interface MinesDevState {
  enabled: boolean;
  devShowMines: boolean;
  devForceAllSafe: boolean;
}

export interface JackpotDevState {
  enabled: boolean;
  devForceWin: boolean;
  devShowWinningNumber: boolean;
}

interface DevModeStore {
  devMode: boolean;
  dice: DiceDevState;
  blackjack: BlackjackDevState;
  rocket: RocketDevState;
  pachinko: PachinkoDevState;
  mines: MinesDevState;
  jackpot: JackpotDevState;

  setDevMode: (active: boolean) => void;
  setDice: (overrides: Partial<DiceDevState>) => void;
  setBlackjack: (overrides: Partial<BlackjackDevState>) => void;
  setRocket: (overrides: Partial<RocketDevState>) => void;
  setPachinko: (overrides: Partial<PachinkoDevState>) => void;
  setMines: (overrides: Partial<MinesDevState>) => void;
  setJackpot: (overrides: Partial<JackpotDevState>) => void;
  getOverrides: (game: string) => Record<string, unknown>;
  isActive: (game: string) => boolean;
  reset: () => void;
}

const DEFAULT_DICE: DiceDevState = {
  enabled: false,
  devForceBreak: false,
  devForceBreakDieIndex: 0,
  devForceDealerValues: null,
  devForcePlayerValues: null,
};

const DEFAULT_BLACKJACK: BlackjackDevState = {
  enabled: false,
  devForceDealerCards: null,
  devForcePlayerCards: null,
  devForceHitCard: null,
  devPeekHole: false,
};

const DEFAULT_ROCKET: RocketDevState = {
  enabled: false,
  devForceCrashPoint: null,
  devShowCrashPoint: false,
};

const DEFAULT_PACHINKO: PachinkoDevState = {
  enabled: false,
  devForceSlots: null,
  devShowMultipliers: false,
};

const DEFAULT_MINES: MinesDevState = {
  enabled: false,
  devShowMines: false,
  devForceAllSafe: false,
};

const DEFAULT_JACKPOT: JackpotDevState = {
  enabled: false,
  devForceWin: false,
  devShowWinningNumber: false,
};

function parseCards(value: string | null): unknown {
  if (!value || !value.trim()) return undefined;
  try {
    const cards = JSON.parse(value);
    if (!Array.isArray(cards)) return undefined;
    return cards;
  } catch {
    return undefined;
  }
}

function parseSlots(value: string | null): unknown {
  if (!value || !value.trim()) return undefined;
  try {
    const arr = JSON.parse(value);
    if (Array.isArray(arr)) return arr.map(Number);
  } catch {
    // ignore JSON parse failure, try comma-separated
  }
  const parts = value.split(",").map((s) => s.trim()).filter(Boolean).map(Number);
  return parts.length > 0 ? parts : undefined;
}

export const useDevModeStore = create<DevModeStore>()(
  subscribeWithSelector((set, get) => ({
    devMode: false,
    dice: { ...DEFAULT_DICE },
    blackjack: { ...DEFAULT_BLACKJACK },
    rocket: { ...DEFAULT_ROCKET },
    pachinko: { ...DEFAULT_PACHINKO },
    mines: { ...DEFAULT_MINES },
    jackpot: { ...DEFAULT_JACKPOT },

    setDevMode: (active: boolean) => set({ devMode: active }),

    setDice: (overrides) =>
      set((state) => ({ dice: { ...state.dice, ...overrides } })),
    setBlackjack: (overrides) =>
      set((state) => ({ blackjack: { ...state.blackjack, ...overrides } })),
    setRocket: (overrides) =>
      set((state) => ({ rocket: { ...state.rocket, ...overrides } })),
    setPachinko: (overrides) =>
      set((state) => ({ pachinko: { ...state.pachinko, ...overrides } })),
    setMines: (overrides) =>
      set((state) => ({ mines: { ...state.mines, ...overrides } })),
    setJackpot: (overrides) =>
      set((state) => ({ jackpot: { ...state.jackpot, ...overrides } })),

    getOverrides: (game: string) => {
      const state = get();
      if (!state.devMode) return {};

      const base: Record<string, unknown> = { devMode: true };

      switch (game) {
        case "dice": {
          const d = state.dice;
          if (!d.enabled) return {};
          if (d.devForceBreak) base.devForceBreak = true;
          if (d.devForceBreak) base.devForceBreakDieIndex = d.devForceBreakDieIndex;
          if (d.devForceDealerValues) base.devForceDealerValues = d.devForceDealerValues;
          if (d.devForcePlayerValues) base.devForcePlayerValues = d.devForcePlayerValues;
          return base;
        }
        case "blackjack": {
          const b = state.blackjack;
          if (!b.enabled) return {};
          const dealerCards = parseCards(b.devForceDealerCards);
          if (dealerCards) base.devForceDealerCards = dealerCards;
          const playerCards = parseCards(b.devForcePlayerCards);
          if (playerCards) base.devForcePlayerCards = playerCards;
          const hitCard = parseCards(b.devForceHitCard);
          if (hitCard) base.devForceHitCard = Array.isArray(hitCard) ? hitCard[0] : hitCard;
          if (b.devPeekHole) base.devPeekHole = true;
          return base;
        }
        case "rocket": {
          const r = state.rocket;
          if (!r.enabled) return {};
          if (r.devForceCrashPoint != null) base.devForceCrashPoint = r.devForceCrashPoint;
          if (r.devShowCrashPoint) base.devShowCrashPoint = true;
          return base;
        }
        case "pachinko": {
          const p = state.pachinko;
          if (!p.enabled) return {};
          const slots = parseSlots(p.devForceSlots);
          if (slots) base.devForceSlots = slots;
          if (p.devShowMultipliers) base.devShowMultipliers = true;
          return base;
        }
        case "mines": {
          const m = state.mines;
          if (!m.enabled) return {};
          if (m.devShowMines) base.devShowMines = true;
          if (m.devForceAllSafe) base.devForceAllSafe = true;
          return base;
        }
        case "jackpot": {
          const j = state.jackpot;
          if (!j.enabled) return {};
          if (j.devForceWin) base.devForceWin = true;
          if (j.devShowWinningNumber) base.devShowWinningNumber = true;
          return base;
        }
        default:
          return {};
      }
    },

    isActive: (game: string) => {
      const state = get();
      if (!state.devMode) return false;
      const g = state[game as keyof typeof state] as { enabled?: boolean } | undefined;
      return g?.enabled === true;
    },

    reset: () =>
      set({
        devMode: false,
        dice: { ...DEFAULT_DICE },
        blackjack: { ...DEFAULT_BLACKJACK },
        rocket: { ...DEFAULT_ROCKET },
        pachinko: { ...DEFAULT_PACHINKO },
        mines: { ...DEFAULT_MINES },
        jackpot: { ...DEFAULT_JACKPOT },
      }),
  })),
);
