/** Mirrors game/domain enums for admin selects (also declared in backend adminSchema). */
export const ITEM_TYPE_CHOICES = [
  { value: "effect", label: "effect — эффект" },
  { value: "item", label: "item — предмет" },
  { value: "roll", label: "roll — бросок" },
  { value: "other", label: "other — прочее" },
] as const;

export const GAME_STATUS_CHOICES = [
  { value: "PLAYING", label: "PLAYING — играет" },
  { value: "COMPLETED", label: "COMPLETED — завершена" },
  { value: "DROPPED", label: "DROPPED — брошена" },
  { value: "REROLLED", label: "REROLLED — перекинут" },
] as const;

export const CELL_TYPE_CHOICES = [
  { value: "start", label: "start — старт" },
  { value: "finish", label: "finish — финиш" },
  { value: "grid", label: "grid — клетка" },
] as const;

export const CELL_CELL_TYPE_CHOICES = [
  { value: "Игра", label: "Игра" },
  { value: "Пресет", label: "Пресет" },
  { value: "Стим", label: "Стим" },
  { value: "Просмотр", label: "Просмотр" },
] as const;

export const CELL_DIFFICULTY_CHOICES = [
  { value: "Лёгкий", label: "Лёгкий" },
  { value: "Средний", label: "Средний" },
  { value: "Сложноватый", label: "Сложноватый" },
  { value: "Сложный", label: "Сложный" },
  { value: "Адский", label: "Адский" },
  { value: "Сердце", label: "Сердце" },
] as const;

export const ACTIVITY_TYPE_CHOICES = [
  { value: "image", label: "image" },
  { value: "emoji", label: "emoji" },
  { value: "chat", label: "chat" },
] as const;
