import { WindowProps, WindowPosition } from "@/types/window";
import { Button } from "../ui/button.component";
import { Maximize, Minus, X } from "lucide-react";
import { useState, useRef, useEffect, memo } from "react";

function WindowComponent(props: WindowProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [position, setPosition] = useState<WindowPosition>({ x: 0, y: 0 });

  const [windowSize, setWindowSize] = useState(() => {
    const initialWidth = Math.min(props.size.width, window.innerWidth);
    const initialHeight = Math.min(props.size.height, window.innerHeight);
    return { width: initialWidth, height: initialHeight };
  });

  const windowRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const windowStartPos = useRef({ x: 0, y: 0 });
  const resizeStartPos = useRef({ x: 0, y: 0 });
  const resizeStartSize = useRef({ width: 0, height: 0 });

  // handle mount centering and maximizing
  useEffect(() => {
    if (props.isMaximized) {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    if (windowRef.current && !isDragging && !isResizing && !props.isMaximized) {
      const rect = windowRef.current.getBoundingClientRect();
      setPosition({
        x: Math.max(0, (window.innerWidth - rect.width) / 2),
        y: Math.max(0, (window.innerHeight - rect.height) / 2),
      });
    }
  }, []);

  // handle window resize to prevent overflow
  useEffect(() => {
    const handleWindowResize = () => {
      setWindowSize((prevSize) => {
        const clampedWidth = Math.min(prevSize.width, window.innerWidth);
        const clampedHeight = Math.min(prevSize.height, window.innerHeight);

        if (
          clampedWidth !== prevSize.width ||
          clampedHeight !== prevSize.height
        ) {
          return { width: clampedWidth, height: clampedHeight };
        }
        return prevSize;
      });

      // prevent window overflow
      setPosition((prevPos) => {
        const maxX = Math.max(0, window.innerWidth - windowSize.width);
        const maxY = Math.max(0, window.innerHeight - windowSize.height);
        return {
          x: Math.min(Math.max(0, prevPos.x), maxX),
          y: Math.min(Math.max(0, prevPos.y), maxY),
        };
      });
    };

    window.addEventListener("resize", handleWindowResize);
    return () => window.removeEventListener("resize", handleWindowResize);
  }, [windowSize.width, windowSize.height]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    windowStartPos.current = { ...position };
    e.preventDefault();
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    resizeStartPos.current = { x: e.clientX, y: e.clientY };
    resizeStartSize.current = {
      width: windowSize.width,
      height: windowSize.height,
    };
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - dragStartPos.current.x;
        const deltaY = e.clientY - dragStartPos.current.y;

        let newX = windowStartPos.current.x + deltaX;
        let newY = windowStartPos.current.y + deltaY;

        // handle boundaries for dragging
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        newX = Math.max(0, Math.min(newX, screenWidth - windowSize.width));
        newY = Math.max(0, Math.min(newY, screenHeight - windowSize.height));

        setPosition({
          x: newX,
          y: newY,
        });
      }

      if (isResizing) {
        const deltaX = e.clientX - resizeStartPos.current.x;
        const deltaY = e.clientY - resizeStartPos.current.y;

        let newWidth = Math.max(200, resizeStartSize.current.width + deltaX);
        let newHeight = Math.max(150, resizeStartSize.current.height + deltaY);

        // handle boundaries for resizing
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const maxWidth = screenWidth;
        const maxHeight = screenHeight;

        // ensure window boundaries
        const availableWidth = screenWidth - position.x;
        const availableHeight = screenHeight - position.y;

        newWidth = Math.min(newWidth, maxWidth, availableWidth);
        newHeight = Math.min(newHeight, maxHeight, availableHeight);

        setWindowSize({
          width: newWidth,
          height: newHeight,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [
    isDragging,
    isResizing,
    window.innerWidth,
    window.innerHeight,
    windowSize.width,
    windowSize.height,
    position.x,
    position.y,
  ]);

  const handleMaximize = () => {
    const fullScreen =
      windowSize.width === window.innerWidth &&
      windowSize.height === window.innerHeight;

    if (fullScreen) {
      return setWindowSize({
        width: props.size?.width,
        height: props.size?.height,
      });
    }

    setPosition({ x: 0, y: 0 });
    setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });
  };

  return (
    <main
      ref={windowRef}
      key={props.id}
      data-window="true"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${windowSize.width}px`,
        height: `${windowSize.height}px`,
        zIndex: props.isActive ? 999 : 50,
        boxShadow: props.isActive ? "8px 8px 25px 0 black" : "none",
        cursor: isDragging ? "grabbing" : "default",
      }}
      className="absolute bg-card border-highlight-high border-2 rounded text-text transition-none overflow-hidden"
    >
      {/* Head */}
      <section
        className="flex flex-row w-full h-12 px-1 items-center justify-between select-none bg-highlight-high"
        onMouseDown={handleMouseDown}
        style={{ cursor: isDragging ? "grabbing" : "grab" }}
      >
        <span className="text-md font-bold">{props.title}</span>

        <div className="flex flex-row">
          <Button
            variant="ghost"
            disabled={props.disabled?.minimize}
            title="Свернуть"
          >
            <Minus />
          </Button>
          <Button
            variant="ghost"
            disabled={props.disabled?.maximize}
            onClick={handleMaximize}
            title="Развернуть"
          >
            <Maximize />
          </Button>
          <Button
            variant="ghost"
            disabled={props.disabled?.close}
            title="Закрыть"
          >
            <X />
          </Button>
        </div>
      </section>

      {/* Body */}
      <section
        className="flex w-full overflow-y-auto p-2"
        style={{ height: "calc(100% - 3rem)" }}
      >
        {props.children}
      </section>

      {/* Resize handle */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
        onMouseDown={handleResizeMouseDown}
        style={{
          background:
            "linear-gradient(135deg, transparent 50%, var(--color-highlight-high) 50%)",
        }}
      />
    </main>
  );
}

const Window = memo(WindowComponent);

export default Window;
