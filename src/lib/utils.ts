import { WindowProps } from "@/types/window";
import { type ClassValue, clsx } from "clsx";
import { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function createWindow(
  prevWindows: WindowProps[],
  newWindow: WindowProps,
  children: ReactNode,
) {
  //check if window already exists
  const existingWindow = prevWindows.find((w) => w.id === newWindow.id);

  //if window already exists, set isActive to true or isMinimized to false and update prevWindows
  if (existingWindow) {
    existingWindow.isMinimized = false;
    existingWindow.isActive = true;

    return [
      ...prevWindows.filter((w) => w.id !== newWindow.id),
      existingWindow,
    ];
  }

  //else create a new window
  const newApp = {
    ...newWindow,
    children: children,
    isActive: true,
  };

  return [...prevWindows, newApp];
}
