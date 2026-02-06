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
  disabled?: {
    maximize?: boolean;
    minimize?: boolean;
    close?: boolean;
  };
}

export interface WindowPosition {
  x: number;
  y: number;
}
