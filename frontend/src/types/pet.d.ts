export interface PetState {
  id: string;
  userId: string;
  hunger: number;
  happiness: number;
  energy: number;
  isAlive: boolean;
  color: string;
  model: string;
  lastUpdated: string;
  lastRewardDate?: string;
  kvasBuff: boolean;
  lastSearchDate?: string;
  created: string;
  updated: string;
}

export type DailyRewardResult =
  | { claimed: true; reward: "money"; amount: number }
  | { claimed: true; reward: "item"; itemLabel: string; itemId: string }
  | { claimed: false; reason: string };

export interface ResurrectResult {
  ok: boolean;
  reason?: string;
  pet?: PetState;
}

export interface SearchResult {
  ok: boolean;
  reason?: string;
  itemLabel?: string;
  itemId?: string;
}
