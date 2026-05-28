import { PaintType, ToolType } from "@/types/paint";
import {
  ReactNode,
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Brush,
  ChevronLeft,
  Circle,
  Eraser,
  GlobeX,
  Minus,
  PaintBucket,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button.component";
import { useUserStore } from "@/store/user.store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSubscription } from "@/hooks/subscription.hook";
import PaintApi from "@/api/paint.api";
import {
  SmallLoader,
  WindowLoader,
} from "@/components/shared/loader.component";
import { WindowError } from "@/components/shared/error.component";
import { Input } from "@/components/ui/input.component";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.component";
import ImageComponent from "@/components/shared/image.component";
import { image } from "@/api/client.api";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { lockCursor } from "@/lib/cursor.utils";
import DrawingCanvas, {
  type DrawingCanvasHandle,
} from "@/components/shared/canvas.component";

const Tools: { value: ToolType; label: string; icon: ReactNode }[] = [
  { value: "brush", label: "Карандаш", icon: <Brush /> },
  { value: "eraser", label: "Ластик", icon: <Eraser /> },
  { value: "rect", label: "Прямоугольник", icon: <Square /> },
  { value: "circle", label: "Круг", icon: <Circle /> },
  { value: "line", label: "Линия", icon: <Minus /> },
  { value: "bucket", label: "Заливка", icon: <PaintBucket /> },
];

const paintApi = new PaintApi();

function DrawPaint({
  setTab,
}: {
  setTab: (value: "home" | "draw" | "list" | "profile") => void;
}) {
  const user = useUserStore((state) => state.user);
  const queryClient = useQueryClient();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const [tool, setTool] = useState<ToolType>("brush");
  const [color, setColor] = useState("#000000");
  const [size, setSize] = useState(6);
  const [alpha, setAlpha] = useState<number>(1);

  const canvasRef = useRef<DrawingCanvasHandle>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [hoveringCanvas, setHoveringCanvas] = useState(false);
  const [panning, setPanning] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["drawPaint"],
    queryFn: async (): Promise<PaintType[]> => {
      if (!user) return [];

      return await paintApi.getDrawinsByAuthor(String(user.id));
    },
    enabled: !!user,
  });

  const invalidateQuery = useCallback(() => {
    startTransition(() => {
      queryClient.invalidateQueries({
        queryKey: ["drawPaint"],
        refetchType: "all",
      });
    });
  }, [queryClient]);

  useSubscription("drawings", "*", invalidateQuery);

  const handleSelect = useCallback(
    async (drawingId: string | null) => {
      if (!drawingId) return;
      const drawing = data?.find((d) => d.id === drawingId);
      if (!drawing) return;
      setSelectedId(drawingId);
      await canvasRef.current?.loadImage(
        `${image.paint}${drawing.id}/${drawing.image}`,
      );
    },
    [data],
  );

  const handleSectionMove = useCallback((e: React.MouseEvent) => {
    const rect = sectionRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const styleId = "__canvas-cursor-override__";
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;

    if ((tool === "brush" || tool === "eraser") && hoveringCanvas) {
      el.style.setProperty("cursor", "none", "important");
      el.classList.add("__canvas-hide-cursor");
      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = ".__canvas-hide-cursor *{cursor:none!important}";
    } else {
      el.style.removeProperty("cursor");
      el.classList.remove("__canvas-hide-cursor");
      styleEl?.remove();
    }

    return () => {
      el.classList.remove("__canvas-hide-cursor");
      document.getElementById(styleId)?.remove();
    };
  }, [tool, hoveringCanvas]);

  useEffect(() => {
    const preventAlt = (e: KeyboardEvent) => {
      if (e.key === "Alt") {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    if (hoveringCanvas) {
      globalThis.addEventListener("keydown", preventAlt, true);
      globalThis.addEventListener("keyup", preventAlt, true);
      return () => {
        globalThis.removeEventListener("keydown", preventAlt, true);
        globalThis.removeEventListener("keyup", preventAlt, true);
      };
    }
  }, [hoveringCanvas]);

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (!e.altKey || !hoveringCanvas) return;
      const el = sectionRef.current;
      if (!el || !el.contains(e.target as Node)) return;
      e.preventDefault();
      e.stopPropagation();
      setSize((s) => Math.max(1, Math.min(100, s - Math.sign(e.deltaY))));
    };
    globalThis.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () =>
      globalThis.removeEventListener("wheel", onWheel, { capture: true });
  }, [hoveringCanvas]);

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    await new Promise((r) => setTimeout(r, 50));
    const stageCanvas = canvasRef.current?.toCanvas();
    if (!stageCanvas) {
      setLoading(false);
      return;
    }
    const blob = await new Promise<Blob | null>((r) =>
      stageCanvas.toBlob((b) => r(b), "image/png"),
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

    if (selectedId) {
      await paintApi.updateDraw(selectedId, data);
    } else {
      const record = await paintApi.createDraw(data);
      setSelectedId(record.id ?? null);
    }

    invalidateQuery();
    setLoading(false);
  };

  if (isLoading) return <WindowLoader />;
  if (isError)
    return (
      <WindowError
        error={new Error("Соединение с сервером потеряно")}
        icon={<GlobeX className="size-28 text-red-500" />}
      />
    );

  return (
    <main className="flex flex-row w-full h-full">
      {/*TOOLS*/}
      <section className="flex flex-col w-45 border-r-2 border-highlight-high p-2">
        {/*BUTTONS*/}
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
        {/*SIZE*/}
        <div className="flex flex-col gap-1 mt-2">
          <label className="text-xs text-text/60 font-bold">Цвет</label>
          <Input
            role="button"
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
            min={1}
            step={1}
            max={100}
            value={size}
            onChange={(e) => setSize(Number(e.currentTarget.value))}
            className="accent-iris"
          />
        </div>
        {/*ALPHA*/}
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
        {/*ARCHIVE*/}
        <div className="flex flex-col gap-1 mt-2">
          <label className="text-xs text-text/60 font-bold">
            {selectedId ? "Редактирование" : "Новый рисунок"}
          </label>
          <Select value={selectedId ?? ""} onValueChange={handleSelect}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Рисунок" />
            </SelectTrigger>
            <SelectContent>
              {data?.map((d) => (
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
        {/*BACK and SAVE*/}
        <div className="flex flex-col mt-auto gap-1">
          <Button
            variant="warning"
            onClick={() => {
              setSelectedId(null);
              canvasRef.current?.clearCanvas();
            }}
          >
            НОВЫЙ
          </Button>
          <div className="flex flex-row gap-1">
            <Button
              variant="error"
              size="icon"
              onClick={() => setTab("home")}
              disabled={loading}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="success"
              className="flex-1"
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? <SmallLoader /> : "Сохранить"}
            </Button>
          </div>
        </div>
      </section>
      {/*CANVAS*/}

      <section
        ref={sectionRef}
        className="flex flex-col flex-1 items-center justify-center overflow-hidden relative bg-background p-0"
        onMouseMove={handleSectionMove}
        onMouseEnter={() => setHoveringCanvas(true)}
        onMouseLeave={() => setHoveringCanvas(false)}
      >
        <TransformWrapper
          limitToBounds={false}
          initialScale={0.5}
          minScale={0.1}
          maxScale={5}
          centerOnInit={true}
          onPanningStart={() => {
            setPanning(true);
            lockCursor("var(--cursor-grabbing, grabbing)");
          }}
          onPanningStop={() => {
            setPanning(false);
            lockCursor(null);
          }}
          panning={{
            allowLeftClickPan: false,
            allowMiddleClickPan: false,
            allowRightClickPan: true,
          }}
          wheel={{ step: 0.1 }}
        >
          <TransformComponent
            contentStyle={{
              width: "100%",
              height: "100%",
              transformOrigin: "0 0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            wrapperStyle={{
              height: "100%",
              width: "100%",
              transformOrigin: "0 0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <DrawingCanvas
              ref={canvasRef}
              tool={tool}
              color={color}
              size={size}
              alpha={alpha}
            />
          </TransformComponent>
        </TransformWrapper>

        {hoveringCanvas && (tool === "brush" || tool === "eraser") && !panning && (
          <div
            className="absolute pointer-events-none border-2 border-iris"
            style={{
              left: cursorPos.x - size / 2,
              top: cursorPos.y - size / 2,
              width: size,
              height: size,
              zIndex: 100,
            }}
          />
        )}
      </section>
    </main>
  );
}

export default DrawPaint;
