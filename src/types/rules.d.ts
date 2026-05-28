import { RecordMeta } from "./record";

export interface Rule extends RecordMeta {
  category: RuleCategory;
  rule: string;
}

export type RuleCategory =
  | "ОСНОВНАЯ СПРАВКА"
  | "УСЛОВИЯ ПРОХОЖДЕНИЯ"
  | "УСЛОВИЯ РЕРОЛЛА"
  | "ВЫБОР СЛОЖНОСТИ"
  | "ПРАВИЛА ХОДА"
  | "КАРТА";
