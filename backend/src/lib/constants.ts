export const USER_ACTIONS = {
  MOVE_POSITIVE: "MOVE_POSITIVE",
  MOVE_NEGATIVE: "MOVE_NEGATIVE",
} as const;

export const STATUS_EFFECTS = {
  EPHEMERALITY: "Эфемерность",
  GYPSY_BARON_BLESSING: "Благословление цыганского барона",
  BORSCH: "Борщ",
  SUBSCRIBED: "subscribed",
} as const;

export const ACTIVITY_TYPES = {
  EMOJI: "emoji",
  IMAGE: "image",
} as const;

export const GAME_STATUSES = {
  PLAYING: "PLAYING",
  COMPLETED: "COMPLETED",
  DROPPED: "DROPPED",
  REROLLED: "REROLLED",
} as const;

export const GAME_STATUS_LABELS: Record<string, string> = {
  [GAME_STATUSES.PLAYING]: "В ПРОЦЕССЕ",
  [GAME_STATUSES.COMPLETED]: "ПРОЙДЕНО",
  [GAME_STATUSES.DROPPED]: "ДРОПНУТО",
  [GAME_STATUSES.REROLLED]: "РЕРОЛЬНУТО",
};

export const SUBSCRIPTION_CONTINUE_COST = 1;

export const LOG_SYSTEM = "SYSTEM";
