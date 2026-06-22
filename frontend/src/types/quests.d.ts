export type QuestReward = {
  type: "item" | "money";
  value: string | number;
};

export interface Quest {
  id: string;
  label: string;
  description: string;
  claimed: string[];
  reward: QuestReward[];
}
