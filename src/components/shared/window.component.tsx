import { WindowProps, WindowPosition } from "@/types/window";
import { Button } from "../ui/button.component";
import { GlobeX, Maximize, Minus, RotateCcw, X } from "lucide-react";
import {
  useState,
  useRef,
  useEffect,
  Suspense,
  cloneElement,
  useCallback,
  Children,
  useMemo,
  RefObject,
  isValidElement,
} from "react";
import { WindowLoader } from "./loader.component";
import React from "react";
import { WindowError } from "./error.component";
import { useDataStore } from "@/store/data.store";
import { useWindowResize } from "@/hooks/resize.hook";
import { useClickAway } from "@uidotdev/usehooks";

function Window(props: WindowProps) {
  const isConnected = useDataStore((state) => state.isConnected);

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const [position, setPosition] = useState<WindowPosition>(
    props.position ??
      props.initialPosition ?? {
        x: Math.max(0, (window.innerWidth - props.size.width) / 2),
        y: Math.max(0, (window.innerHeight - props.size.height) / 2),
      },
  );

  const [isRefreshing, setIsRefreshing] = useState(false);

  const [oldData, setOldData] = useState<{
    position: WindowPosition;
    size: { width: number; height: number };
  }>({
    position: props.position ?? props.initialPosition ?? { x: 0, y: 0 },
    size: props.size ?? { width: 0, height: 0 },
  });

  const [windowSize, setWindowSize] = useState(() => {
    const initialWidth = Math.min(props.size.width, window.innerWidth);
    const initialHeight = Math.min(props.size.height, window.innerHeight);
    return { width: initialWidth, height: initialHeight };
  });

  const windowRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const windowStartPos = useRef({ x: 0, y: 0 });

  const refreshKeyRef = useRef(props.refreshKey);
  refreshKeyRef.current = props.refreshKey;

  const clickAwayRef = useClickAway((e: Event) => {
    const target = e.target as HTMLElement;
    const otherWindow = target.closest('[data-window="true"]');
    if (!otherWindow && props.isActive && !props.isPinned) {
      props.onInactive?.();
    }
  });

  const { handleResizeStart, handleResizeMove, resizeHandles } =
    useWindowResize({
      windowSize,
      position,
      isResizing,
      minWidth: props.size.minWidth,
      minHeight: props.size.minHeight,
      onActive: props.onActive,
      windowRef,
      setIsResizing,
      setPosition,
      setWindowSize,
    });

  //handle mount centering and maximizing
  useEffect(() => {
    setTimeout(() => props.setIsOpening?.(false), 300);

    if (props.isMaximized) {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }
  }, [props.isMaximized]);

  //sync position and size from props changes (e.g., moveWindow)
  useEffect(() => {
    if (props.position) {
      setPosition(props.position);
    }
    setWindowSize({
      width: Math.min(props.size.width, window.innerWidth),
      height: Math.min(props.size.height, window.innerHeight),
    });
  }, [props.position, props.size]);

  //handle window resize to prevent overflow
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

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - dragStartPos.current.x;
        const deltaY = e.clientY - dragStartPos.current.y;

        let newX = windowStartPos.current.x + deltaX;
        let newY = windowStartPos.current.y + deltaY;

        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        newX = Math.max(0, Math.min(newX, screenWidth - windowSize.width));
        newY = Math.max(0, Math.min(newY, screenHeight - windowSize.height));

        setPosition({
          x: newX,
          y: newY,
        });
      }

      handleResizeMove(e);
    },
    [isDragging, handleResizeMove, windowSize, setPosition],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, [setIsDragging, setIsResizing]);

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleResizeMove, windowSize, setPosition]);

  const handleMaximize = () => {
    const fullScreen =
      windowSize.width === window.innerWidth &&
      windowSize.height === window.innerHeight;

    if (fullScreen) {
      const size = {
        width:
          oldData.size.width <= window.innerWidth
            ? oldData.size.width
            : window.innerWidth,
        height:
          oldData.size.height <= window.innerHeight
            ? oldData.size.height
            : window.innerHeight,
      };

      setWindowSize(size);
      setPosition(oldData.position);
      return;
    }

    setOldData({ position: position, size: windowSize });
    setPosition({ x: 0, y: 0 });
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
  };

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    props.onRefresh?.();

    //reset refresh state for visual feedback
    setTimeout(() => setIsRefreshing(false), 300);
  }, [props.onRefresh]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    windowStartPos.current = { ...position };
    props.onActive?.();
    e.preventDefault();
  };

  const getChildren = useCallback(() => {
    if (!isConnected && props.id !== "auth")
      return (
        <WindowError
          error={new Error("Соединение с сервером потеряно")}
          icon={<GlobeX className="size-28 text-red-500" />}
        />
      );

    return Children.map(props.children, (child, index) =>
      isValidElement(child)
        ? cloneElement(child, { key: `${refreshKeyRef.current}-${index}` })
        : child,
    );
  }, [isConnected, props.children]);

  const windowStyle = useMemo(
    () => ({
      transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
      width: `${windowSize.width}px`,
      height: `${windowSize.height}px`,
      zIndex: props.isPinned ? 999 : props.isActive ? 998 : 50,
      boxShadow:
        props.isPinned || props.isActive ? "8px 8px 25px 0 black" : "none",
      cursor: isDragging ? "grabbing" : "default",
      willChange: isDragging || isResizing ? "transform" : "auto",
    }),
    [
      position.x,
      position.y,
      windowSize.width,
      windowSize.height,
      props.isPinned,
      props.isActive,
      isDragging,
      isResizing,
    ],
  );

  return (
    <main
      ref={(el: HTMLDivElement | null) => {
        windowRef.current = el;
        (clickAwayRef as RefObject<HTMLDivElement | null>).current = el;
      }}
      key={props.id}
      data-window="true"
      style={{
        ...windowStyle,
        display: "grid",
        gridTemplateRows: "auto 1fr",
      }}
      className="absolute overflow-hidden rounded bg-card text-text transition-none"
      hidden={props.isMinimized}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (
          target.closest('button, a, input, select, textarea, [role="button"]')
        ) {
          return;
        }
        props.onActive?.();
      }}
    >
      {/* Head */}
      <section
        className="flex h-12 w-full flex-row items-center justify-between bg-highlight-high px-1 select-none"
        onMouseDown={handleMouseDown}
        style={{ cursor: isDragging ? "grabbing" : "grab" }}
      >
        <div className="flex flex-row items-center justify-center">
          <Button variant="ghost" title="Перезагрузить" onClick={handleRefresh}>
            <RotateCcw />
          </Button>
          <span className="text-md font-bold" onDoubleClick={handleMaximize}>
            {props.title}
          </span>
        </div>

        <div className="flex flex-row">
          <Button
            variant="ghost"
            disabled={props.disabled?.minimize}
            title="Свернуть"
            onClick={props.onMinimize}
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
            disabled={props.disabled?.close || props.isPinned}
            title="Закрыть"
            onClick={props.onClose}
          >
            <X />
          </Button>
        </div>
      </section>

      {/* Body */}
      <section
        className={`flex w-full flex-1 min-h-0 flex-col ${props.overflow ? "overflow-auto" : ""}`}
      >
        <Suspense fallback={<WindowLoader />}>
          {isRefreshing ? <WindowLoader /> : getChildren()}
        </Suspense>
      </section>

      {/* Resize */}
      {resizeHandles.map((handle) => (
        <div
          key={handle.direction}
          className={handle.className}
          style={handle.style}
          onMouseDown={(e) => handleResizeStart(e, handle.direction)}
        />
      ))}
    </main>
  );
}

export default Window;
