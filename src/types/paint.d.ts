export interface PaintType {
  id?: string;
  author: {
    id: string;
    username: string;
  };
  image: File;
  created?: string;
  updated?: string;
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
