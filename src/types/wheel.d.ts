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

export type AnimationState = {
  startTime: number;
  velocity: number;
};
