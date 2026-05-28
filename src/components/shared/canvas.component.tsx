import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Stage, Layer, Line, Rect, Image as KonvaImage } from "react-konva";
import type { ToolType } from "@/types/paint";
import type Konva from "konva";

const CW = 600;
const CH = 450;

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  id: number;
  color: string;
  size: number;
  alpha: number;
  points: Point[];
}

interface Props {
  tool: ToolType;
  color: string;
  size: number;
  alpha: number;
}

export interface DrawingCanvasHandle {
  toCanvas: () => HTMLCanvasElement | null;
  clearCanvas: () => void;
  loadImage: (url: string) => Promise<void>;
}

const DrawingCanvas = forwardRef<DrawingCanvasHandle, Props>(
  ({ tool, color, size, alpha }, ref) => {
    const stageRef = useRef<Konva.Stage>(null);
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
    const [rasterImage, setRasterImage] = useState<HTMLCanvasElement | null>(
      null,
    );
    const drawing = useRef(false);
    const idCounter = useRef(0);
    const currentPointsRef = useRef<Point[]>([]);
    const needsNewStroke = useRef(false);

    const clearCanvas = useCallback(() => {
      setStrokes([]);
      setCurrentPoints([]);
      setRasterImage(null);
      currentPointsRef.current = [];
      idCounter.current = 0;
    }, []);

    const loadImage = useCallback(async (url: string) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = url;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
      });

      const canvas = document.createElement("canvas");
      canvas.width = CW;
      canvas.height = CH;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, CW, CH);
      ctx.drawImage(img, 0, 0, CW, CH);

      setRasterImage(canvas);
      setStrokes([]);
      setCurrentPoints([]);
      currentPointsRef.current = [];
      idCounter.current = 0;
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        toCanvas: () => stageRef.current?.toCanvas() ?? null,
        clearCanvas,
        loadImage,
      }),
      [clearCanvas, loadImage],
    );

    const getPos = useCallback((): Point => {
      const stage = stageRef.current;
      if (!stage) return { x: 0, y: 0 };
      const p = stage.getPointerPosition();
      return p ?? { x: 0, y: 0 };
    }, []);

    const handleMouseDown = useCallback(
      (e: Konva.KonvaEventObject<MouseEvent>) => {
        if (e.evt.button !== 0) return;
        const pos = getPos();

        if (tool === "bucket") {
          const stage = stageRef.current;
          if (!stage) return;
          const canvas = stage.toCanvas();
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          const img = ctx.getImageData(0, 0, CW, CH);
          const d = img.data;

          const tmp = document.createElement("canvas");
          tmp.width = 1;
          tmp.height = 1;
          const tc = tmp.getContext("2d")!;
          tc.fillStyle = color;
          tc.fillRect(0, 0, 1, 1);
          const fd = tc.getImageData(0, 0, 1, 1).data;

          const si = (Math.round(pos.y) * CW + Math.round(pos.x)) * 4;
          const tr = d[si],
            tg = d[si + 1],
            tb = d[si + 2],
            ta = d[si + 3];

          if (tr === fd[0] && tg === fd[1] && tb === fd[2] && ta === fd[3])
            return;

          const stack: [number, number][] = [
            [Math.round(pos.x), Math.round(pos.y)],
          ];
          const visited = new Uint8Array(CW * CH);

          while (stack.length) {
            const [x, y] = stack.pop()!;
            if (x < 0 || x >= CW || y < 0 || y >= CH) continue;
            const idx = y * CW + x;
            if (visited[idx]) continue;
            const bi = idx * 4;
            if (
              d[bi] !== tr ||
              d[bi + 1] !== tg ||
              d[bi + 2] !== tb ||
              d[bi + 3] !== ta
            )
              continue;

            visited[idx] = 1;
            d[bi] = fd[0];
            d[bi + 1] = fd[1];
            d[bi + 2] = fd[2];
            d[bi + 3] = fd[3];

            stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
          }

          ctx.putImageData(img, 0, 0);
          setRasterImage(canvas);
          setStrokes([]);
          return;
        }

        drawing.current = true;
        currentPointsRef.current = [pos];
        setCurrentPoints([pos]);
      },
      [tool, color, getPos],
    );

    const handleMouseMove = useCallback(
      (_e: Konva.KonvaEventObject<MouseEvent>) => {
        if (!drawing.current) return;
        const pos = getPos();

        if (needsNewStroke.current) {
          needsNewStroke.current = false;
          currentPointsRef.current = [pos];
          setCurrentPoints([pos]);
          return;
        }

        currentPointsRef.current.push(pos);
        setCurrentPoints([...currentPointsRef.current]);
      },
      [getPos],
    );

    const finalizeDraw = useCallback(() => {
      if (!drawing.current) return;
      drawing.current = false;

      let pts = currentPointsRef.current;
      if (pts.length > 0) {
        if (pts.length === 1) pts = [pts[0], pts[0]];
        const isErasing = tool === "eraser";
        const newStroke: Stroke = {
          id: idCounter.current++,
          color: isErasing ? "#ffffff" : color,
          size,
          alpha: isErasing ? 1 : alpha,
          points: pts,
        };
        setStrokes((prev) => [...prev, newStroke]);
      }
      currentPointsRef.current = [];
      setCurrentPoints([]);
    }, [tool, color, size, alpha]);

    const handleMouseUp = useCallback(finalizeDraw, [finalizeDraw]);

    const handleMouseLeave = useCallback(() => {
      if (drawing.current) {
        finalizeDraw();
        needsNewStroke.current = true;
      }
    }, [finalizeDraw]);

    const handleMouseEnter = useCallback(
      (_e: Konva.KonvaEventObject<MouseEvent>) => {
        if (needsNewStroke.current) {
          needsNewStroke.current = false;
          drawing.current = true;
          currentPointsRef.current = [getPos()];
          setCurrentPoints([getPos()]);
        }
      },
      [getPos],
    );

    useEffect(() => {
      const preventCtx = (e: MouseEvent) => e.preventDefault();
      globalThis.addEventListener("mouseup", finalizeDraw);
      globalThis.addEventListener("contextmenu", preventCtx);
      return () => {
        globalThis.removeEventListener("mouseup", finalizeDraw);
        globalThis.removeEventListener("contextmenu", preventCtx);
      };
    }, [finalizeDraw]);

    return (
      <Stage
        ref={stageRef}
        width={CW}
        height={CH}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ touchAction: "none" }}
      >
        <Layer>
          <Rect x={0} y={0} width={CW} height={CH} fill="white" />
          {rasterImage && (
            <KonvaImage
              image={rasterImage}
              x={0}
              y={0}
              width={CW}
              height={CH}
            />
          )}
        </Layer>
        <Layer>
          {strokes.map((s) => (
            <Line
              key={s.id}
              points={s.points.flatMap((p) => [p.x, p.y])}
              stroke={s.color}
              strokeWidth={s.size}
              tension={0.3}
              lineCap="round"
              lineJoin="round"
              opacity={s.alpha}
            />
          ))}
          {currentPoints.length > 1 && (
            <Line
              points={currentPoints.flatMap((p) => [p.x, p.y])}
              stroke={tool === "eraser" ? "#ffffff" : color}
              strokeWidth={size}
              tension={0.3}
              lineCap="round"
              lineJoin="round"
              opacity={tool === "eraser" ? 1 : alpha}
            />
          )}
        </Layer>
      </Stage>
    );
  },
);

export default DrawingCanvas;
