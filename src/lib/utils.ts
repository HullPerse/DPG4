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
    existingWindow.isActive = true;
    existingWindow.isMinimized = false;
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

export function closeWindow(prevWindows: WindowProps[], windowId: string) {
  const existingWindow = prevWindows.find((w) => w.id === windowId);

  if (existingWindow) {
    existingWindow.isActive = false;
    return [...prevWindows.filter((w) => w.id !== windowId)];
  }

  return prevWindows;
}

export function minimizeWindow(prevWindows: WindowProps[], windowId: string) {
  const existingWindow = prevWindows.find((w) => w.id === windowId);

  if (existingWindow) {
    existingWindow.isActive = false;
    existingWindow.isMinimized = true;
    return [...prevWindows.filter((w) => w.id !== windowId), existingWindow];
  }

  return prevWindows;
}

export function unminimizeWindow(prevWindows: WindowProps[], windowId: string) {
  const existingWindow = prevWindows.find((w) => w.id === windowId);

  if (existingWindow) {
    existingWindow.isActive = true;
    existingWindow.isMinimized = false;
    return [...prevWindows.filter((w) => w.id !== windowId), existingWindow];
  }

  return prevWindows;
}

export function activeWindow(prevWindows: WindowProps[], windowId: string) {
  const existingWindow = prevWindows.find((w) => w.id === windowId);

  if (existingWindow) {
    existingWindow.isActive = true;
    return [...prevWindows.filter((w) => w.id !== windowId), existingWindow];
  }

  return prevWindows;
}
