export interface Cell {
  id: string;
  type: "start" | "finish" | "grid";
  number: number;
  title: string;
  conditions: Record<string, string>;
  cellType: string;
  difficulty: string;
  ladderTo: number;
  snakeTo: number;
  status: string[] | null;
}
