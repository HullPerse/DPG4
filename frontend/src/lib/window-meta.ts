import type { WindowProps } from "@/types/window";

let _windows: Record<string, Partial<WindowProps>> = {};

export function setWindowMetaList(list: { id: string; title: string; size?: Record<string, number>; overflow?: boolean; disabled?: { minimize?: boolean; close?: boolean } }[]) {
  const map: Record<string, Partial<WindowProps>> = {};
  for (const w of list) {
    map[w.id] = w as Partial<WindowProps>;
  }
  _windows = map;
}

export function getWindowMeta(id: string): Partial<WindowProps> {
  return _windows[id] ?? {};
}

export const FALLBACK_WINDOWS: Record<string, Partial<WindowProps>> = {
  auth: { id: "auth", title: "Авторизация", overflow: true, size: { width: 640, height: 480 }, disabled: { minimize: true, close: true } },
  signout: { id: "signout", title: "Выход", size: { width: 640, height: 480 } },
};
