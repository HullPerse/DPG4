export type DiceType = "d4" | "d6" | "d8" | "d10" | "d12" | "d20";

export type DiceItem = {
  id: string | number;
  value: number;
  type: DiceType;
  isRolling: boolean;
  isPlaceholder?: boolean;
};
