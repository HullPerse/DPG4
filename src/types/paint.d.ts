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

export type ToolType = "brush" | "eraser" | "bucket";

// type StrokePoint = { x: number; y: number };

// type Stroke = {
//   tool: Exclude<ToolType, "bucket">;
//   color: string;
//   size: number;
//   alpha: number;
//   points: StrokePoint[];
// };
