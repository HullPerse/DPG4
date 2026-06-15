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

export type SpinResponse = {
  shuffled: WheelItem[];
  winnerIndex: number;
};

export type WheelHistoryRecord = {
  id: string;
  userId: string;
  owner: { id: string; username: string } | null;
  itemId: string;
  itemLabel: string;
  itemImage: string;
  itemType: string;
  listType: string;
  cost: number;
  free: boolean;
  created: string;
};

export type WheelHistoryResponse = {
  data: WheelHistoryRecord[];
  total: number;
  page: number;
  limit: number;
};
