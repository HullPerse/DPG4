import PaintApi from "@/api/paint.api";
import { SmallLoader } from "@/components/shared/loader.component";
import { Button } from "@/components/ui/button.component";
import { Input } from "@/components/ui/input.component";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.component";
import { useUserStore } from "@/store/user.store";
import { PaintType } from "@/types/paint";
import { Brush, ChevronLeft, Eraser, PaintBucket } from "lucide-react";
import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { image } from "@/api/client.api";
import { useSubscription } from "@/hooks/subscription.hook";
import ImageComponent from "@/components/shared/image.component";

const paintApi = new PaintApi();

type ToolType = "brush" | "eraser" | "bucket";

type StrokePoint = { x: number; y: number };

type Stroke = {
  tool: Exclude<ToolType, "bucket">;
  color: string;
  size: number;
  alpha: number;
  points: StrokePoint[];
};

const Tools: { value: ToolType; label: string; icon: React.ReactNode }[] = [
  { value: "brush", label: "Карандаш", icon: <Brush /> },
  { value: "eraser", label: "Ластик", icon: <Eraser /> },
  { value: "bucket", label: "Заливка", icon: <PaintBucket /> },
];

const CW = 600;
const CH = 450;

function DrawPage({
  setTab,
}: {
  setTab: (value: "home" | "draw" | "list" | "profile") => void;
}) {
  const user = useUserStore((state) => state.user);
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState<boolean>(false);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(
    null,
  );

  const { data: drawings } = useQuery({
    queryKey: ["profilePaint"],
    queryFn: async () => {
      if (!user) return [];
      return await paintApi.getDrawinsByAuthor(String(user.id));
    },
    enabled: !!user,
  });

  const [tool, setTool] = useState<ToolType>("brush");
  const [color, setColor] = useState("#000000");
  const [size, setSize] = useState(6);
  const [alpha, setAlpha] = useState<number>(1);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // const cursorPos = useRef({ x: 0, y: 0 });
  const [hovering, setHovering] = useState(false);

  const strokesRef = useRef<Stroke[]>([]);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const drawing = useRef(false);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panning = useRef(false);
  const panLast = useRef({ x: 0, y: 0 });

  const [cursorRadius, setCursorRadius] = useState(size / 2);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setCursorRadius(size / 2);
  }, [size]);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, CW, CH);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CW, CH);

    for (const stroke of strokesRef.current) {
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = stroke.tool === "eraser" ? 1 : stroke.alpha;
      ctx.strokeStyle = stroke.tool === "eraser" ? "#ffffff" : stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (stroke.points.length === 1) {
        const p = stroke.points[0];
        ctx.beginPath();
        ctx.arc(p.x, p.y, stroke.size / 2, 0, Math.PI * 2);
        ctx.fillStyle = stroke.tool === "eraser" ? "#ffffff" : stroke.color;
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      }

      ctx.restore();
    }
  }, []);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  const loadDrawing = useCallback(
    async (drawingId: string) => {
      const drawing = drawings?.find((d) => d.id === drawingId);
      if (!drawing) return;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = `${image.paint}${drawing.id}/${drawing.image}`;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          ctx.clearRect(0, 0, CW, CH);
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, CW, CH);
          ctx.drawImage(img, 0, 0, CW, CH);
          resolve();
        };
        img.onerror = reject;
      });

      strokesRef.current = [];
    },
    [drawings],
  );

  const handleSelectDrawing = useCallback(
    (drawingId: string | null) => {
      if (!drawingId) return;
      setSelectedDrawingId(drawingId);
      loadDrawing(drawingId);
    },
    [loadDrawing],
  );

  const invalidateQuery = useCallback(() => {
    startTransition(() => {
      queryClient.invalidateQueries({
        queryKey: ["profilePaint"],
        refetchType: "all",
      });
    });
  }, [queryClient]);

  useSubscription("drawings", "*", invalidateQuery);

  const pos = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current;
    if (!c) return { x: 0, y: 0 };
    const r = c.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * CW,
      y: ((e.clientY - r.top) / r.height) * CH,
    };
  }, []);

  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const c = canvasRef.current;
      if (!c) return;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      const p = pos(e);

      if (e.button === 2) {
        panning.current = true;
        panLast.current = { x: e.clientX, y: e.clientY };
        return;
      }

      if (e.button !== 0) return;

      if (tool === "bucket") {
        const img = ctx.getImageData(0, 0, CW, CH);
        const d = img.data;

        const tmp = document.createElement("canvas");
        tmp.width = 1;
        tmp.height = 1;
        const tc = tmp.getContext("2d")!;
        tc.fillStyle = color;
        tc.fillRect(0, 0, 1, 1);
        const fd = tc.getImageData(0, 0, 1, 1).data;

        const si = (Math.round(p.y) * CW + Math.round(p.x)) * 4;
        const tr = d[si],
          tg = d[si + 1],
          tb = d[si + 2],
          ta = d[si + 3];

        if (tr === fd[0] && tg === fd[1] && tb === fd[2] && ta === fd[3])
          return;

        const stack: [number, number][] = [[Math.round(p.x), Math.round(p.y)]];
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
        return;
      }

      drawing.current = true;

      const stroke: Stroke = {
        tool,
        color,
        size,
        alpha,
        points: [p],
      };

      currentStrokeRef.current = stroke;
      strokesRef.current.push(stroke);

      redrawCanvas();
    },
    [tool, color, size, alpha, pos, redrawCanvas],
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const container = containerRef.current;
      if (container) {
        const r = container.getBoundingClientRect();
        setCursorPos({ x: e.clientX - r.left, y: e.clientY - r.top });
      }

      if (panning.current) {
        const dx = e.clientX - panLast.current.x;
        const dy = e.clientY - panLast.current.y;
        panLast.current = { x: e.clientX, y: e.clientY };
        setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
        return;
      }

      if (!drawing.current) return;

      const p = pos(e);
      const stroke = currentStrokeRef.current;
      if (!stroke) return;

      stroke.points.push(p);
      redrawCanvas();
    },
    [pos, redrawCanvas],
  );

  const onEnd = useCallback(() => {
    drawing.current = false;
    panning.current = false;
    currentStrokeRef.current = null;
  }, []);

  const wasOutside = useRef(false);

  const onEnter = useCallback(() => {
    setHovering(true);
    wasOutside.current = true;
  }, []);
  const onLeave = useCallback(() => {
    setHovering(false);
    panning.current = false;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handler = (e: WheelEvent) => {
      e.preventDefault();

      if (e.altKey) {
        setSize((s) => Math.max(2, Math.min(100, s - Math.sign(e.deltaY) * 2)));
        return;
      }

      const container = containerRef.current;
      if (!container) return;

      const cr = container.getBoundingClientRect();
      const mouseX = e.clientX - cr.left;
      const mouseY = e.clientY - cr.top;

      const direction = e.deltaY > 0 ? -1 : 1;
      const factor = 1.1;
      const newZoom = Math.max(
        0.1,
        Math.min(10, direction > 0 ? zoom * factor : zoom / factor),
      );

      setPan((prev) => ({
        x: mouseX - ((mouseX - prev.x) / zoom) * newZoom,
        y: mouseY - ((mouseY - prev.y) / zoom) * newZoom,
      }));
      setZoom(newZoom);
    };

    canvas.addEventListener("wheel", handler, { passive: false });
    return () => canvas.removeEventListener("wheel", handler);
  }, [zoom]);

  useEffect(() => {
    const up = () => {
      drawing.current = false;
      panning.current = false;
      currentStrokeRef.current = null;
    };
    globalThis.addEventListener("mouseup", up);
    return () => globalThis.removeEventListener("mouseup", up);
  }, []);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    el.addEventListener("contextmenu", (e) => e.preventDefault());

    const preventAlt = (e: KeyboardEvent) => {
      if (e.key === "Alt") {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    globalThis.addEventListener("keydown", preventAlt, true);
    globalThis.addEventListener("keyup", preventAlt, true);

    return () => {
      globalThis.removeEventListener("keydown", preventAlt, true);
      globalThis.removeEventListener("keyup", preventAlt, true);
    };
  }, []);

  return (
    <main className="flex flex-row w-full h-full">
      <div className="flex flex-col w-45 border-r-2 border-highlight-high p-2">
        <div className="grid grid-cols-2 gap-2">
          {Tools.map((b) => (
            <Button
              key={b.value}
              title={b.label}
              variant="link"
              className="text-text hover:bg-text/20 disabled:bg-text/20 disabled:text-primary disabled:opacity-85 shadow-sharp-sm border w-20"
              disabled={tool === b.value}
              onClick={() => setTool(b.value)}
            >
              {b.icon}
            </Button>
          ))}
        </div>
        <div className="flex flex-col gap-1 mt-2">
          <Input
            type="color"
            value={color}
            onChange={(e) => setColor(e.currentTarget.value)}
            className="p-0 text-text hover:bg-text/20 disabled:bg-text/20 disabled:text-primary disabled:opacity-85 border"
          />
        </div>
        <div className="flex flex-col gap-1 mt-2">
          <label className="text-xs text-text/60 font-bold">
            Размер: {size}px
          </label>
          <input
            type="range"
            min={2}
            max={100}
            value={size}
            onChange={(e) => setSize(Number(e.currentTarget.value))}
            className="w-full accent-iris"
          />
        </div>

        <div className="flex flex-col gap-1 mt-2">
          <label className="text-xs text-text/60 font-bold">
            Прозрачность: {Math.round(alpha * 100)}%
          </label>
          <input
            type="range"
            min={0.05}
            max={1}
            step={0.05}
            value={alpha}
            onChange={(e) => setAlpha(Number(e.currentTarget.value))}
            className="w-full accent-iris"
          />
        </div>

        <div className="flex flex-col gap-1 mt-2">
          <label className="text-xs text-text/60 font-bold">
            {selectedDrawingId ? "Редактирование" : "Новый рисунок"}
          </label>
          <Select
            value={selectedDrawingId ?? ""}
            onValueChange={handleSelectDrawing}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Рисунок" />
            </SelectTrigger>
            <SelectContent>
              {drawings?.map((d) => (
                <SelectItem
                  key={d.id}
                  value={d.id ?? ""}
                  className="flex flex-row bg-background"
                >
                  <ImageComponent
                    src={`${image.paint}${d.id}/${d.image}`}
                    alt="Картинка ЛОЛ"
                    className="w-6 h-4"
                  />
                  <span>
                    {" "}
                    {new Date(d.created ?? "").toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="mt-auto flex flex-row gap-1">
          <Button
            variant="error"
            size="icon"
            disabled={loading}
            onClick={() => setTab("home")}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="success"
            className="flex-1"
            onClick={async () => {
              if (!user) return;

              setLoading(true);
              await new Promise((r) => setTimeout(r, 50));
              const canvas = canvasRef.current;
              if (!canvas) {
                setLoading(false);
                return;
              }
              const blob = await new Promise<Blob | null>((r) =>
                canvas.toBlob((b) => r(b), "image/png"),
              );
              if (!blob) {
                setLoading(false);
                return;
              }
              const imageFile = new File([blob], "drawing.png", {
                type: "image/png",
              });

              const data = {
                author: {
                  id: user.id,
                  username: user.username,
                },
                image: imageFile,
              } as PaintType;

              if (selectedDrawingId) {
                await paintApi.updateDraw(selectedDrawingId, data);
              } else {
                const record = await paintApi.createDraw(data);
                setSelectedDrawingId(record.id ?? null);
              }

              invalidateQuery();
              setLoading(false);
            }}
            disabled={loading}
          >
            {loading ? <SmallLoader /> : "Сохранить"}
          </Button>
        </div>
      </div>
      <div
        ref={containerRef}
        className="flex flex-col flex-1 items-center justify-center overflow-hidden relative"
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
            width: CW,
            height: CH,
            flexShrink: 0,
          }}
        >
          <canvas
            ref={canvasRef}
            width={CW}
            height={CH}
            style={{
              display: "block",
              cursor:
                tool === "brush" || tool === "eraser" ? "none" : "default",
              touchAction: "none",
            }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onEnd}
            onMouseEnter={onEnter}
            onMouseLeave={onLeave}
          />
        </div>
        {hovering && (tool === "brush" || tool === "eraser") && (
          <div
            style={{
              position: "absolute",
              left: cursorPos.x - cursorRadius,
              top: cursorPos.y - cursorRadius,
              width: cursorRadius * 2,
              height: cursorRadius * 2,
              borderRadius: "50%",
              border: "2px solid var(--color-iris)",
              boxSizing: "border-box",
              pointerEvents: "none",
              zIndex: 10,
            }}
          />
        )}
      </div>
    </main>
  );
}

export default DrawPage;
