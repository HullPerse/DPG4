export interface WindowProps {
  id: string;
  title: string;
  children: ReactNode;
  size: {
    width: number;
    maxWidth?: number;
    height: number;
    maxHeight?: number;
  };
  isActive?: boolean;
  isMinimized?: boolean;
  isMaximized?: boolean;
  disabled?: {
    maximize?: boolean;
    minimize?: boolean;
    close?: boolean;
  };
  //when opening set it to isActive and zindex to 100
  //when mot active set zindex to 50
}

export interface WindowPosition {
  x: number;
  y: number;
}
