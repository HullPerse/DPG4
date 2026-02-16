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
  };

  return [...prevWindows, newApp];
}

export function closeWindow(prevWindows: WindowProps[], windowId: string) {
  const existingWindow = prevWindows.find((w) => w.id === windowId);

  if (existingWindow) {
    existingWindow.isActive = false;
    return [prevWindows.filter((w) => w.id !== windowId)];
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
    const updatedWindows = prevWindows.map((w) => ({
      ...w,
      isActive: w.id === windowId,
    }));

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

    const updatedWindows = prevWindows.map((w) => ({
      ...w,
      isActive: w.id === windowId,
    }));

    const otherWindows = updatedWindows.filter((w) => w.id !== windowId);

    return [...otherWindows, refreshedWindow];
  }

  return prevWindows;
}
