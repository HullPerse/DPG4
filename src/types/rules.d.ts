export interface Rule {
  id: string;
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
