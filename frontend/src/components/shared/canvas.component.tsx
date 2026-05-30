import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import useUndo from "use-undo";
import {
  Stage,
  Layer,
  Line,
  Rect,
  Ellipse,
  Image as KonvaImage,
} from "react-konva";
import type { ToolType, CanvasElement, Point } from "@/types/paint";
import type Konva from "konva";

const CW = 600;
const CH = 450;
const ERASER_COLOR = "#ffffff";

const SHAPE_TOOLS: ReadonlySet<ToolType> = new Set([
  "rect",
  "circle",
  "line",
]);

type CanvasSnapshot = {
  elements: CanvasElement[];
  rasterImage: HTMLCanvasElement | null;
};

const EMPTY_SNAPSHOT: CanvasSnapshot = { elements: [], rasterImage: null };

interface Props {
  tool: ToolType;
  color: string;
  size: number;
  alpha: number;
  onHistoryChange?: (state: { canUndo: boolean; canRedo: boolean }) => void;
}

export interface DrawingCanvasHandle {
  toCanvas: () => HTMLCanvasElement | null;
  clearCanvas: () => void;
  loadImage: (url: string) => Promise<void>;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const isShape = (t: ToolType): boolean => SHAPE_TOOLS.has(t);

function cloneCanvas(source: HTMLCanvasElement | null): HTMLCanvasElement | null {
  if (!source) return null;
  const clone = document.createElement("canvas");
  clone.width = source.width;
  clone.height = source.height;
  clone.getContext("2d")!.drawImage(source, 0, 0);
  return clone;
}

function cloneSnapshot(snapshot: CanvasSnapshot): CanvasSnapshot {
  return {
    elements: snapshot.elements.map((el) => ({
      ...el,
      points: el.points.map((p) => ({ ...p })),
    })),
    rasterImage: cloneCanvas(snapshot.rasterImage),
  };
}

const DrawingCanvas = forwardRef<DrawingCanvasHandle, Props>(
  ({ tool, color, size, alpha, onHistoryChange }, ref) => {
    const stageRef = useRef<Konva.Stage>(null);
    const [
      { present: snapshot },
      { set: setSnapshot, reset: resetSnapshot, undo, redo, canUndo, canRedo },
    ] = useUndo<CanvasSnapshot>(EMPTY_SNAPSHOT);

    const { elements, rasterImage } = snapshot;
    const snapshotRef = useRef(snapshot);
    snapshotRef.current = snapshot;

    const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
    const drawing = useRef(false);
    const idCounter = useRef(0);
    const currentPointsRef = useRef<Point[]>([]);
    const needsNewStroke = useRef(false);

    const commitSnapshot = useCallback(
      (next: CanvasSnapshot) => {
        setSnapshot(cloneSnapshot(next));
      },
      [setSnapshot],
    );

    const clearCanvas = useCallback(() => {
      resetSnapshot(cloneSnapshot(EMPTY_SNAPSHOT));
      setCurrentPoints([]);
      currentPointsRef.current = [];
      idCounter.current = 0;
    }, [resetSnapshot]);

    const loadImage = useCallback(
      async (url: string) => {
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

        resetSnapshot(cloneSnapshot({ elements: [], rasterImage: canvas }));
        setCurrentPoints([]);
        currentPointsRef.current = [];
        idCounter.current = 0;
      },
      [resetSnapshot],
    );

    useImperativeHandle(
      ref,
      () => ({
        toCanvas: () => stageRef.current?.toCanvas() ?? null,
        clearCanvas,
        loadImage,
        undo,
        redo,
        canUndo,
        canRedo,
      }),
      [clearCanvas, loadImage, undo, redo, canUndo, canRedo],
    );

    useEffect(() => {
      onHistoryChange?.({ canUndo, canRedo });
    }, [canUndo, canRedo, onHistoryChange]);

    const getPos = useCallback((): Point => {
      const stage = stageRef.current;
      if (!stage) return { x: 0, y: 0 };
      const p = stage.getPointerPosition();
      return p ?? { x: 0, y: 0 };
    }, []);

    const finalizeStroke = useCallback(() => {
      if (!drawing.current) return;
      drawing.current = false;

      const pts = currentPointsRef.current;
      if (pts.length > 0) {
        if (pts.length === 1) pts.push({ ...pts[0] });
        const isErasing = tool === "eraser";
        const newEl: CanvasElement = {
          id: idCounter.current++,
          type: tool,
          color: isErasing ? ERASER_COLOR : color,
          size,
          alpha: isErasing ? 1 : alpha,
          points: pts,
        };
        commitSnapshot({
          ...snapshotRef.current,
          elements: [...snapshotRef.current.elements, newEl],
        });
      }
      currentPointsRef.current = [];
      setCurrentPoints([]);
    }, [tool, color, size, alpha, commitSnapshot]);

    const finalizeShape = useCallback(() => {
      if (!drawing.current) return;
      drawing.current = false;

      const pts = currentPointsRef.current;
      if (pts.length >= 2) {
        const newEl: CanvasElement = {
          id: idCounter.current++,
          type: tool as "rect" | "circle" | "line",
          color,
          size,
          alpha,
          points: [pts[0], pts[pts.length - 1]],
        };
        commitSnapshot({
          ...snapshotRef.current,
          elements: [...snapshotRef.current.elements, newEl],
        });
      }
      currentPointsRef.current = [];
      setCurrentPoints([]);
    }, [tool, color, size, alpha, commitSnapshot]);

    const handlePointerUp = useCallback(() => {
      if (!drawing.current) return;
      if (isShape(tool)) finalizeShape();
      else finalizeStroke();
    }, [tool, finalizeShape, finalizeStroke]);

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
          commitSnapshot({ elements: [], rasterImage: canvas });
          return;
        }

        if (isShape(tool)) {
          drawing.current = true;
          currentPointsRef.current = [pos];
          setCurrentPoints([pos]);
          return;
        }

        drawing.current = true;
        currentPointsRef.current = [pos];
        setCurrentPoints([pos]);
      },
      [tool, color, getPos, commitSnapshot],
    );

    const handleMouseMove = useCallback(
      (_e: Konva.KonvaEventObject<MouseEvent>) => {
        if (!drawing.current) return;
        const pos = getPos();

        if (isShape(tool)) {
          currentPointsRef.current = [currentPointsRef.current[0], pos];
          setCurrentPoints([...currentPointsRef.current]);
          return;
        }

        if (needsNewStroke.current) {
          needsNewStroke.current = false;
          currentPointsRef.current = [pos];
          setCurrentPoints([pos]);
          return;
        }

        currentPointsRef.current.push(pos);
        setCurrentPoints([...currentPointsRef.current]);
      },
      [tool, getPos],
    );

    const handleMouseLeave = useCallback(() => {
      if (!drawing.current) return;
      if (tool === "brush" || tool === "eraser") {
        finalizeStroke();
        needsNewStroke.current = true;
      }
      drawing.current = false;
      currentPointsRef.current = [];
      setCurrentPoints([]);
    }, [tool, finalizeStroke]);

    const handleMouseEnter = useCallback(
      (_e: Konva.KonvaEventObject<MouseEvent>) => {
        if (needsNewStroke.current) {
          needsNewStroke.current = false;
          const pos = getPos();
          if (pos.x === 0 && pos.y === 0) return;
          drawing.current = true;
          currentPointsRef.current = [pos];
          setCurrentPoints([pos]);
        }
      },
      [getPos],
    );

    useEffect(() => {
      const preventCtx = (e: MouseEvent) => e.preventDefault();
      globalThis.addEventListener("mouseup", handlePointerUp);
      globalThis.addEventListener("contextmenu", preventCtx);
      return () => {
        globalThis.removeEventListener("mouseup", handlePointerUp);
        globalThis.removeEventListener("contextmenu", preventCtx);
      };
    }, [handlePointerUp]);

    return (
      <div style={{ position: "relative", width: CW, height: CH }}>
        <Stage
          ref={stageRef}
          width={CW}
          height={CH}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handlePointerUp}
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
            {elements.map((el) => {
              if (
                el.type === "brush" ||
                el.type === "eraser" ||
                el.type === "line"
              ) {
                return (
                  <Line
                    key={el.id}
                    points={el.points.flatMap((p) => [p.x, p.y])}
                    stroke={el.color}
                    strokeWidth={el.size}
                    tension={el.type === "line" ? 0 : 0.3}
                    lineCap="round"
                    lineJoin="round"
                    opacity={el.alpha}
                  />
                );
              }
              if (el.type === "rect") {
                const sx = el.points[0].x,
                  sy = el.points[0].y;
                const ex = el.points[1].x,
                  ey = el.points[1].y;
                return (
                  <Rect
                    key={el.id}
                    x={Math.min(sx, ex)}
                    y={Math.min(sy, ey)}
                    width={Math.abs(ex - sx)}
                    height={Math.abs(ey - sy)}
                    stroke={el.color}
                    strokeWidth={el.size}
                    opacity={el.alpha}
                  />
                );
              }
              if (el.type === "circle") {
                const cx = el.points[0].x,
                  cy = el.points[0].y;
                const ex = el.points[1].x,
                  ey = el.points[1].y;
                const r = Math.sqrt((ex - cx) ** 2 + (ey - cy) ** 2);
                return (
                  <Ellipse
                    key={el.id}
                    x={cx}
                    y={cy}
                    radiusX={r}
                    radiusY={r}
                    stroke={el.color}
                    strokeWidth={el.size}
                    opacity={el.alpha}
                  />
                );
              }
              return null;
            })}
            {currentPoints.length > 1 &&
              (tool === "brush" || tool === "eraser") && (
                <Line
                  points={currentPoints.flatMap((p) => [p.x, p.y])}
                  stroke={tool === "eraser" ? ERASER_COLOR : color}
                  strokeWidth={size}
                  tension={0.3}
                  lineCap="round"
                  lineJoin="round"
                  opacity={tool === "eraser" ? 1 : alpha}
                />
              )}
            {currentPoints.length > 1 && tool === "rect" && (
              <Rect
                x={Math.min(currentPoints[0].x, currentPoints[1].x)}
                y={Math.min(currentPoints[0].y, currentPoints[1].y)}
                width={Math.abs(currentPoints[1].x - currentPoints[0].x)}
                height={Math.abs(currentPoints[1].y - currentPoints[0].y)}
                stroke={color}
                strokeWidth={size}
                opacity={alpha}
              />
            )}
            {currentPoints.length > 1 && tool === "circle" && (
              <Ellipse
                x={currentPoints[0].x}
                y={currentPoints[0].y}
                radiusX={Math.sqrt(
                  (currentPoints[1].x - currentPoints[0].x) ** 2 +
                    (currentPoints[1].y - currentPoints[0].y) ** 2,
                )}
                radiusY={Math.sqrt(
                  (currentPoints[1].x - currentPoints[0].x) ** 2 +
                    (currentPoints[1].y - currentPoints[0].y) ** 2,
                )}
                stroke={color}
                strokeWidth={size}
                opacity={alpha}
              />
            )}
            {currentPoints.length > 1 && tool === "line" && (
              <Line
                points={[
                  currentPoints[0].x,
                  currentPoints[0].y,
                  currentPoints[1].x,
                  currentPoints[1].y,
                ]}
                stroke={color}
                strokeWidth={size}
                opacity={alpha}
              />
            )}
          </Layer>
        </Stage>
      </div>
    );
  },
);

export default DrawingCanvas;
