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
    createdAt: new Date(),
    refreshKey: 0,
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
    // Set all windows to inactive, then set the selected one to active
    const updatedWindows = prevWindows.map((w) => ({
      ...w,
      isActive: w.id === windowId,
    }));

    // Move the active window to the end of the array (highest z-index)
    const activeWindow = updatedWindows.find((w) => w.id === windowId);
    const otherWindows = updatedWindows.filter((w) => w.id !== windowId);

    return [...otherWindows, activeWindow!];
  }

  return prevWindows;
}

export function refreshWindow(prevWindows: WindowProps[], windowId: string) {
  const existingWindow = prevWindows.find((w) => w.id === windowId);

  if (existingWindow) {
    const refreshedWindow = {
      ...existingWindow,
      refreshKey: (existingWindow.refreshKey || 0) + 1,
      isActive: true,
    };

    // Set all windows to inactive except the refreshed one
    const updatedWindows = prevWindows.map((w) => ({
      ...w,
      isActive: w.id === windowId,
    }));

    // Move the refreshed window to the end of the array (highest z-index)
    const otherWindows = updatedWindows.filter((w) => w.id !== windowId);

    return [...otherWindows, refreshedWindow];
  }

  return prevWindows;
}
