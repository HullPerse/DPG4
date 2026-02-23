import { WindowProps } from "@/types/window";
import { ReactNode } from "react";

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
    initialPosition: {
      x: Math.max(0, (window.innerWidth - newWindow.size.width) / 2),
      y: Math.max(0, (window.innerHeight - newWindow.size.height) / 2),
    },
  } as WindowProps;

  return [...prevWindows, newApp];
}

export function closeWindow(prevWindows: WindowProps[], windowId: string) {
  const existingWindow = prevWindows.find((w) => w.id === windowId);
  if (!existingWindow) return prevWindows;

  existingWindow.isActive = false;
  return prevWindows.filter((w) => w.id !== windowId);
}

export function minimizeWindow(prevWindows: WindowProps[], windowId: string) {
  const existingWindow = prevWindows.find((w) => w.id === windowId);
  if (!existingWindow) return prevWindows;

  existingWindow.isActive = false;
  existingWindow.isMinimized = true;
  return [...prevWindows.filter((w) => w.id !== windowId), existingWindow];
}

export function unminimizeWindow(prevWindows: WindowProps[], windowId: string) {
  const existingWindow = prevWindows.find((w) => w.id === windowId);

  if (!existingWindow) return prevWindows;

  existingWindow.isActive = true;
  existingWindow.isMinimized = false;
  return [...prevWindows.filter((w) => w.id !== windowId), existingWindow];
}

export function activeWindow(prevWindows: WindowProps[], windowId: string) {
  const existingWindow = prevWindows.find((w) => w.id === windowId);

  if (!existingWindow) return prevWindows;

  return prevWindows.map((w) => ({
    ...w,
    isActive: w.id === windowId,
    isMinimized: false,
  }));
}

export function deactivateWindow(prevWindows: WindowProps[], windowId: string) {
  const existingWindow = prevWindows.find((w) => w.id === windowId);

  if (!existingWindow) return prevWindows;

  return prevWindows.map((w) => ({
    ...w,
    isActive: w.id === windowId ? false : w.isActive,
  }));
}

export function pinWindow(prevWindows: WindowProps[], windowId: string) {
  const existingWindow = prevWindows.find((w) => w.id === windowId);
  if (!existingWindow) return prevWindows;

  const pinnedWindow = {
    ...existingWindow,
    isPinned: !existingWindow.isPinned,
  };

  const otherWindows = prevWindows.filter((w) => w.id !== windowId);

  return [...otherWindows, pinnedWindow];
}

export function refreshWindow(prevWindows: WindowProps[], windowId: string) {
  const existingWindow = prevWindows.find((w) => w.id === windowId);
  if (!existingWindow) return prevWindows;

  const refreshedWindow = {
    ...existingWindow,
    refreshKey: (existingWindow.refreshKey || 0) + 1,
    isActive: true,
  };

  const updatedWindows = prevWindows.map((w) => ({
    ...w,
    isActive: w.id === windowId,
  }));

  const otherWindows = updatedWindows.filter((w) => w.id !== windowId);

  return [...otherWindows, refreshedWindow];
}

export function moveWindow(
  prevWindows: WindowProps[],
  windowId: string,
  direction: string,
) {
  const existingWindow = prevWindows.find((w) => w.id === windowId);
  if (!existingWindow) return prevWindows;

  const directionMap: Record<
    string,
    { position: { x: number; y: number }; size: { width: number; height: number } }
  > = {
    up: {
      position: { x: 0, y: 0 },
      size: { width: window.innerWidth, height: window.innerHeight / 2 },
    },
    down: {
      position: { x: 0, y: window.innerHeight / 2 },
      size: { width: window.innerWidth, height: window.innerHeight / 2 },
    },
    left: {
      position: { x: 0, y: 0 },
      size: { width: window.innerWidth / 2, height: window.innerHeight },
    },
    right: {
      position: { x: window.innerWidth / 2, y: 0 },
      size: { width: window.innerWidth / 2, height: window.innerHeight },
    },
  };

  const config = directionMap[direction];
  if (!config) return prevWindows;

  const updatedWindow = {
    ...existingWindow,
    position: config.position,
    size: config.size,
  };

  const otherWindows = prevWindows.filter((w) => w.id !== windowId);

  return [...otherWindows, updatedWindow];
}
