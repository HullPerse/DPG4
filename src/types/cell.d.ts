import { RecordMeta } from "./record";

export interface Cell extends RecordMeta {
  type: "start" | "finish" | "grid";
  number: number;
  title: string;
  conditions: Record<string, string>;
  cellType: string;
  difficulty: string;
  ladderTo: number;
  snakeTo: number;
  status: string[] | null;
  captured: string[] | null;
}
