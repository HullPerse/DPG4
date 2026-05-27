import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button.component";
import { useEffect, useState, useRef, useCallback } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { createPortal } from "react-dom";

interface ImageViewerProps {
  className?: string;
  trigger?: React.ReactNode;
  src: string[] | null;
  zoomable?: boolean;
  draggable?: boolean;
}

const MIN = 0.5;
const MAX = 5;
const STEP = 0.25;

function ImageViewer({
  className,
  src,
  trigger,
  zoomable,
  draggable,
}: ImageViewerProps) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLDivElement>(null);

  const reset = useCallback(() => {
    setScale(1);
    setPos({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    reset();
  }, [index, reset]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowRight")
        setIndex((i) => Math.min(i + 1, (src?.length ?? 1) - 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    };
    globalThis.addEventListener("keydown", onKey);
    return () => globalThis.removeEventListener("keydown", onKey);
  }, [open, src?.length]);

  const zoom = useCallback(
    (d: number) => {
      if (!zoomable) return;
      setScale((s) => {
        const ns = Math.max(MIN, Math.min(MAX, s * d));
        if (ns <= 1) setPos({ x: 0, y: 0 });
        return ns;
      });
    },
    [zoomable],
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!draggable) return;
      e.preventDefault();
      setDrag(true);
      setDragStart({ x: e.clientX - pos.x, y: e.clientY - pos.y });
    },
    [draggable, pos],
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!draggable || !drag) return;
      setPos({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    },
    [draggable, drag, dragStart],
  );

  const onMouseUp = useCallback(() => setDrag(false), []);

  if (!src || src.length === 0) return null;

  const img = src[index];
  const multi = src.length > 1;

  const content = (
    <div
      className={cn(
        "fixed inset-0 z-99999 flex items-center justify-center p-4 transition-all duration-300",
        open
          ? "scale-100 opacity-100"
          : "pointer-events-none scale-95 opacity-0",
      )}
    >
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* modal */}
      <div
        className={cn(
          "relative z-10 max-h-[90vh] max-w-[90vw] overflow-hidden",
          "border-2 border-highlight-high shadow-sharp",
          "bg-card text-text",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
        style={{
          display: "grid",
          gridTemplateRows: "auto 1fr",
        }}
      >
        {/* header */}
        <section className="flex h-10 items-center justify-between bg-background px-1 select-none border-b-2 border-highlight-high">
          <span className="text-md font-bold line-clamp-1 px-1">
            {multi ? `Изображение ${index + 1} / ${src.length}` : "Просмотр"}
          </span>
          <div className="flex items-center gap-0">
            {zoomable && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => zoom(1 - STEP)}
                  title="Уменьшить"
                >
                  <ZoomOut />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => zoom(1 + STEP)}
                  title="Увеличить"
                >
                  <ZoomIn />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={reset}
                  title="Сбросить"
                >
                  <RotateCcw />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              title="Закрыть"
            >
              <X />
            </Button>
          </div>
        </section>

        {/* image area */}
        <section
          ref={imageRef}
          className="flex items-center justify-center overflow-hidden bg-background p-0"
          style={{
            width: "70vw",
            height: "70vh",
            maxWidth: "100%",
            maxHeight: "100%",
            cursor: drag ? "grabbing" : draggable ? "grab" : "default",
          }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          <img
            src={img}
            alt={`Image ${index + 1}`}
            className="max-h-full max-w-full object-contain select-none"
            style={{
              transform: `scale(${scale}) translate(${pos.x / scale}px, ${pos.y / scale}px)`,
              transition: drag ? "none" : "transform 0.2s ease-out",
            }}
            draggable={false}
          />
        </section>

        {/* thumbnails */}
        {multi && (
          <section className="flex items-center justify-center gap-2 bg-background border-t-2 border-highlight-high p-2">
            {src.map((s, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className={cn(
                  "h-10 w-10 cursor-pointer rounded border-2 transition-all overflow-hidden",
                  i === index
                    ? "border-iris"
                    : "border-highlight-high hover:border-iris/50",
                )}
              >
                <img src={s} className="h-full w-full object-cover" alt="" />
              </button>
            ))}
          </section>
        )}
      </div>
    </div>
  );

  return (
    <>
      {trigger && (
        <div
          onClick={() => setOpen(true)}
          className="flex hover:cursor-pointer w-full h-full"
        >
          {trigger}
        </div>
      )}
      {open && createPortal(content, document.body)}
    </>
  );
}

export default ImageViewer;
