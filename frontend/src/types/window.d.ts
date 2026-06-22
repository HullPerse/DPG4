export interface WindowProps {
  id: string;
  title: string;
  children: ReactNode;
  size: {
    minWidth?: number;
    minHeight?: number;
    width: number;
    height: number;
  };
  position: {
    x: number;
    y: number;
  };
  initialPosition: {
    x: number;
    y: number;
  };
  isActive?: boolean;
  isMinimized?: boolean;
  isMaximized?: boolean;
  isPinned?: boolean;
  createdAt?: Date;
  disabled?: {
    maximize?: boolean;
    minimize?: boolean;
    close?: boolean;
  };

  overflow?: boolean;
  onClose?: () => void;
  onMinimize?: () => void;
  onActive?: () => void;
  onInactive?: () => void;
  onRefresh?: () => void;
  setIsOpening?: (value: boolean) => void;
  refreshKey?: number;
  zIndex?: number;
}

export interface WindowPosition {
  x: number;
  y: number;
}

export type ResizeDirection =
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export interface ResizeState {
  startPos: { x: number; y: number };
  startSize: { width: number; height: number };
  startPosition: { x: number; y: number };
  direction: ResizeDirection;
}

export interface UseWindowResizeProps {
  windowSize: { width: number; height: number };
  position: WindowPosition;
  isResizing: boolean;
  minWidth?: number;
  minHeight?: number;
  onActive?: () => void;
  windowRef: React.RefObject<HTMLDivElement | null>;
  setIsResizing: React.Dispatch<React.SetStateAction<boolean>>;
  setPosition: React.Dispatch<React.SetStateAction<WindowPosition>>;
  setWindowSize: React.Dispatch<React.SetStateAction<{ width: number; height: number }>>;
}
