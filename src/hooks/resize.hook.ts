import { useRef, useCallback } from "react";
import { WindowPosition } from "@/types/window";

export type ResizeDirection =
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

interface ResizeState {
  startPos: { x: number; y: number };
  startSize: { width: number; height: number };
  startPosition: { x: number; y: number };
  direction: ResizeDirection;
}

interface UseWindowResizeProps {
  windowSize: { width: number; height: number };
  position: WindowPosition;
  isResizing: boolean;
  minWidth?: number;
  minHeight?: number;
  onActive?: () => void;
  windowRef: React.RefObject<HTMLDivElement | null>;
  setIsResizing: React.Dispatch<React.SetStateAction<boolean>>;
  setPosition: React.Dispatch<React.SetStateAction<WindowPosition>>;
  setWindowSize: React.Dispatch<
    React.SetStateAction<{ width: number; height: number }>
  >;
}

export const useWindowResize = ({
  windowSize,
  position,
  isResizing,
  minWidth = 200,
  minHeight = 150,
  onActive,
  windowRef,
  setIsResizing,
  setPosition,
  setWindowSize,
}: UseWindowResizeProps) => {
  const resizeState = useRef<ResizeState | null>(null);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, direction: ResizeDirection) => {
      e.preventDefault();
      e.stopPropagation();

      setIsResizing(true);
      resizeState.current = {
        startPos: { x: e.clientX, y: e.clientY },
        startSize: { width: windowSize.width, height: windowSize.height },
        startPosition: { x: position.x, y: position.y },
        direction,
      };
      onActive?.();
    },
    [windowSize, position, onActive, windowRef, setIsResizing],
  );

  const handleResizeMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !resizeState.current) return;

      const state = resizeState.current;
      const deltaX = e.clientX - state.startPos.x;
      const deltaY = e.clientY - state.startPos.y;

      let newWidth = state.startSize.width;
      let newHeight = state.startSize.height;
      let newX = state.startPosition.x;
      let newY = state.startPosition.y;

      switch (state.direction) {
        case "left":
        case "top-left":
        case "bottom-left":
          const leftDelta = Math.max(-state.startSize.width + minWidth, deltaX);
          newWidth = state.startSize.width - leftDelta;
          newX += leftDelta;
          break;
        case "right":
        case "top-right":
        case "bottom-right":
          newWidth = Math.max(minWidth, state.startSize.width + deltaX);
          break;
      }

      switch (state.direction) {
        case "top":
        case "top-left":
        case "top-right":
          const topDelta = Math.max(-state.startSize.height + minHeight, deltaY);
          newHeight = state.startSize.height - topDelta;
          newY += topDelta;
          break;
        case "bottom":
        case "bottom-left":
        case "bottom-right":
          newHeight = Math.max(minHeight, state.startSize.height + deltaY);
          break;
      }

      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;

      newX = Math.max(0, newX);
      newY = Math.max(0, newY);
      newWidth = Math.min(newWidth, screenWidth - newX);
      newHeight = Math.min(newHeight, screenHeight - newY);

      setPosition({ x: newX, y: newY });
      setWindowSize({ width: newWidth, height: newHeight });
    },
    [isResizing, setPosition, setWindowSize],
  );

  const resizeHandles: {
    className: string;
    direction: ResizeDirection;
    style?: React.CSSProperties;
  }[] = [
    {
      className: "absolute top-0 left-0 right-0 h-1 cursor-n-resize",
      direction: "top" as const,
    },
    {
      className: "absolute bottom-0 left-0 right-0 h-1 cursor-s-resize",
      direction: "bottom" as const,
    },
    {
      className: "absolute top-0 bottom-0 left-0 w-1 cursor-w-resize",
      direction: "left" as const,
    },
    {
      className: "absolute top-0 bottom-0 right-0 w-1 cursor-e-resize",
      direction: "right" as const,
    },
    {
      className: "absolute top-0 left-0 w-3 h-3 cursor-nw-resize",
      direction: "top-left" as const,
    },
    {
      className: "absolute top-0 right-0 w-3 h-3 cursor-ne-resize",
      direction: "top-right" as const,
    },
    {
      className: "absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize",
      direction: "bottom-left" as const,
    },
    {
      className: "absolute bottom-0 right-0 w-4 h-4 cursor-se-resize",
      direction: "bottom-right" as const,
      style: {
        background:
          "linear-gradient(135deg, transparent 50%, var(--color-highlight-high) 50%)",
      },
    },
  ];

  return {
    handleResizeStart,
    handleResizeMove,
    resizeHandles,
    resizeState,
  };
};
