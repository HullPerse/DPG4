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

  onClose?: () => void;
  onMinimize?: () => void;
  onActive?: () => void;
  onInactive?: () => void;
  onRefresh?: () => void;
  setIsOpening?: (value: boolean) => void;
  refreshKey?: number;
}

export interface WindowPosition {
  x: number;
  y: number;
}
