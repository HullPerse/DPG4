export interface WindowProps {
  id: string;
  title: string;
  children: ReactNode;
  size: {
    width: number;
    height: number;
  };
  isActive?: boolean;
  isMinimized?: boolean;
  isMaximized?: boolean;
  createdAt?: Date;
  disabled?: {
    maximize?: boolean;
    minimize?: boolean;
    close?: boolean;
  };

  onClose?: () => void;
  onMinimize?: () => void;
  onActive?: () => void;
  onRefresh?: () => void;
  refreshKey?: number;
}

export interface WindowPosition {
  x: number;
  y: number;
}
