import { apiFetch } from "./client.api";

export interface AppMeta {
  name: string;
  label: string;
  priority: number;
  link?: string;
  type?: "browser" | "window";
  adminOnly?: boolean;
}

export interface WindowMeta {
  id: string;
  title: string;
  overflow?: boolean;
  size: {
    minWidth?: number;
    minHeight?: number;
    width?: number;
    height?: number;
  };
  disabled?: {
    minimize?: boolean;
    close?: boolean;
  };
}

export interface LinkEntry {
  description: string;
  link: string;
}

export interface UiConfig {
  apps: AppMeta[];
  windows: WindowMeta[];
  links: {
    browserGames: LinkEntry[];
    logicalGames: LinkEntry[];
    flashGames: LinkEntry[];
  };
}

export async function fetchUiConfig(): Promise<UiConfig> {
  return apiFetch<UiConfig>("/utils/config", { method: "GET" });
}

export interface ModelCameraConfig {
  position: [number, number, number];
  fov: number;
}

export interface ModelTransformConfig {
  scale: number;
  position: [number, number, number];
  rotation: [number, number, number];
}

export interface ModelConfigEntry {
  id: string;
  label: string;
  file: string;
  camera: ModelCameraConfig;
  model: ModelTransformConfig;
  dead: ModelTransformConfig;
}

export async function fetchModelConfigs(): Promise<ModelConfigEntry[]> {
  return apiFetch<ModelConfigEntry[]>("/utils/model-configs", { method: "GET" });
}
