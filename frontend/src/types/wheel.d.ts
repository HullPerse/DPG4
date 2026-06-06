export type WheelItem = {
  id: string;
  label: string;
  image: string;
  type: "image" | "emoji";
};

export type WheelRoll = {
  isRolling: boolean;
  hasRolled: boolean;
};

export type EasingAnimation = {
  startTime: number;
  startScroll: number;
  targetScroll: number;
  duration: number;
};
