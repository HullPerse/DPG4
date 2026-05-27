import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";
import { ReactNode, useEffect, useState } from "react";
import { Button } from "../ui/button.component";
import { X } from "lucide-react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import ImageComponent from "./image.component";
import { lockCursor } from "@/lib/cursor.utils";

interface ImageViewerProps {
  className?: string;
  trigger?: ReactNode;
  triggerClassName?: string;
  src: string[] | null;
  zoomable?: boolean;
  draggable?: boolean;
}

function ImageViewer({
  className,
  src,
  trigger,
  triggerClassName,
  zoomable = true,
  draggable = true,
}: ImageViewerProps) {
  const [open, setOpen] = useState<boolean>(false);
  const [index, setIndex] = useState(0);

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

  if (!src || src.length === 0) return null;

  const img = src[index];
  const multi = src.length > 1;

  const content = (
    <main
      className={cn(
        "fixed inset-0 z-99999 flex flex-col items-center justify-center p-2 transition-all duration-300",
        open
          ? "scale-100 opacity-100"
          : "pointer-events-none scale-95 opacity-0",
      )}
      data-image-viewer="true"
    >
      {/* BACKDROP */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur"
        onClick={() => setOpen(false)}
      />

      <div
        className={cn(
          "relative z-10 max-h-[90vh] max-w-[90vw] w-xl min-w-xl overflow-hidden",
          "border-2 border-highlight-high shadow-sharp",
          "bg-card text-text",
          className,
        )}
        style={{
          display: "grid",
          gridTemplateRows: "auto 1fr",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/*HEADER*/}
        <section className="flex h-10 w-full flex-row items-center justify-between bg-background px-1 select-none border-b-2 border-highlight-high">
          <span className=" flex item-center text-md font-bold line-clamp-1">
            {multi ? `Изображение [${index + 1} / ${src.length}]` : "Просмотр"}
          </span>

          <Button
            variant="ghost"
            title="Закрыть"
            onClick={() => setOpen(false)}
          >
            <X />
          </Button>
        </section>
        {/*BODY*/}

        <section className="flex items-center justify-center overflow-hidden bg-background p-0">
          <TransformWrapper
            limitToBounds={false}
            initialScale={0.5}
            minScale={0.1}
            maxScale={5}
            centerOnInit={true}
            onPanningStart={() => {
              lockCursor("var(--cursor-grabbing, grabbing)");
            }}
            onPanningStop={() => {
              lockCursor(null);
            }}
            panning={{
              disabled: !draggable,
              allowLeftClickPan: true,
              allowMiddleClickPan: false,
              allowRightClickPan: true,
            }}
            wheel={{ disabled: !zoomable, step: 0.1 }}
          >
            <TransformComponent
              contentStyle={{
                width: "60vh",
                height: "60vw",
                transformOrigin: "0 0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              wrapperStyle={{
                transformOrigin: "0 0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ImageComponent
                src={img}
                alt={`Image ${index + 1}`}
                className="overflow-visible w-full h-full"
                type="contain"
              />
            </TransformComponent>
          </TransformWrapper>
        </section>

        {/*CONTROLS*/}
        {multi && (
          <section className="flex items-center justify-center gap-2 bg-background border-t-2 border-highlight-high p-2">
            {src.map((s, i) => (
              <Button
                key={i}
                size="icon"
                onClick={() => setIndex(i)}
                className={cn(
                  "h-10 w-10 cursor-pointer rounded border-2 transition-all overflow-hidden",
                  i === index
                    ? "border-iris scale-110"
                    : "border-highlight-high hover:border-iris/50 scale-100",
                )}
                disabled={i === index}
              >
                <ImageComponent
                  src={s}
                  className="h-full w-full object-cover"
                  alt=""
                />
              </Button>
            ))}
          </section>
        )}
      </div>
    </main>
  );

  return (
    <>
      {trigger && (
        <div
          onClick={() => setOpen(true)}
          className={cn(
            "flex hover:cursor-pointer w-full h-full",
            triggerClassName,
          )}
        >
          {trigger}
        </div>
      )}
      {open && createPortal(content, document.body)}
    </>
  );
}

export default ImageViewer;
