export interface PetState {
  id: string;
  userId: string;
  hunger: number;
  happiness: number;
  energy: number;
  isAlive: boolean;
  lastUpdated: string;
  lastRewardDate?: string;
  created: string;
  updated: string;
}

export type DailyRewardResult =
  | { claimed: true; reward: "money"; amount: number }
  | { claimed: true; reward: "item"; itemLabel: string; itemId: string }
  | { claimed: false; reason: string };
