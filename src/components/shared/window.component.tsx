import { WindowProps, WindowPosition } from "@/types/window";
import { Button } from "../ui/button.component";
import { Maximize, Minus, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";

// isActive?: boolean;
// isMinimized: boolean;
// isMaximized: boolean;

export default function Window(props: WindowProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [position, setPosition] = useState<WindowPosition>({ x: 0, y: 0 });
  const [windowSize, setWindowSize] = useState({
    width: props.size.width,
    height: props.size.height,
  });

  const windowRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const windowStartPos = useRef({ x: 0, y: 0 });
  const resizeStartPos = useRef({ x: 0, y: 0 });
  const resizeStartSize = useRef({ width: 0, height: 0 });

  // Center window on mount
  useEffect(() => {
    if (windowRef.current && !isDragging && !isResizing) {
      const rect = windowRef.current.getBoundingClientRect();
      setPosition({
        x: (window.innerWidth - rect.width) / 2,
        y: (window.innerHeight - rect.height) / 2,
      });
    }
  }, []);

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

        // Apply screen boundaries for dragging
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

        // Apply screen boundaries for resizing
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const maxWidth = props.size.maxWidth ?? screenWidth;
        const maxHeight = props.size.maxHeight ?? screenHeight;

        // Ensure window doesn't exceed screen boundaries
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
    props.size.maxWidth,
    props.size.maxHeight,
    windowSize.width,
    windowSize.height,
    position.x,
    position.y,
  ]);

  return (
    <main
      ref={windowRef}
      key={props.id}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${windowSize.width}px`,
        height: `${windowSize.height}px`,
        zIndex: props.isActive ? 999 : 50,
        boxShadow: props.isActive ? "4px 4px 14px 0 black" : "none",
        cursor: isDragging ? "grabbing" : "default",
      }}
      className="absolute bg-card border-highlight-high border-2 rounded text-text transition-none overflow-hidden"
    >
      {/* Head */}
      <section
        className="flex flex-row w-full py-2 rounded-t border-b-2 border-x-0 border-t-0 border-highlight-high px-1 items-center justify-between select-none"
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
            onClick={() => {
              if (
                windowSize.width === window.innerWidth &&
                windowSize.height === window.innerHeight &&
                windowRef.current
              ) {
                const rect = windowRef.current.getBoundingClientRect();
                setPosition({
                  x: (window.innerWidth - rect.width) / 2,
                  y: (window.innerHeight - rect.height) / 2,
                });
                return setWindowSize(props.size);
              }

              setPosition({
                x: 0,
                y: 0,
              });
              setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
              });
            }}
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
      <section className="overflow-y-auto h-full">{props.children}</section>

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
