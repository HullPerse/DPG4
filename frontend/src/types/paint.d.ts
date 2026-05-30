import { RecordMeta } from "./record";

export interface PaintType extends RecordMeta {
  author: {
    id: string;
    username: string;
  };
  image: File;
}

export type ToolType =
  | "brush"
  | "eraser"
  | "bucket"
  | "rect"
  | "circle"
  | "line";

export interface Point {
  x: number;
  y: number;
}

export interface CanvasElement {
  id: number;
  type: ToolType;
  color: string;
  size: number;
  alpha: number;
  points: Point[];
}
