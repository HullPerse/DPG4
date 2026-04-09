import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";
import { invoke } from "@tauri-apps/api/core";
import type { DataStore } from "@/types/store";

export const useDataStore = create<DataStore>()(
  subscribeWithSelector(
    persist(
      (set) => ({
        wallpaper: "",
        font: "",
        isConnected: false,
        isEditing: false,
        arrowType: "all",
        userProfile: null,

        setWallpaper: (wallpaper: string) => {
          set({ wallpaper });
        },
        setFont: (font: string) => {
          set({ font });
        },
        setConnected: (isConnected: boolean) => {
          set({ isConnected });
        },
        setEditing: (isEditing: boolean) => {
          set({ isEditing });
        },
        setArrowType: (arrowType: DataStore["arrowType"]) => {
          set({ arrowType });
        },
        setUserProfile: (userProfile: string | null) => {
          set({ userProfile });
        },
      }),
      {
        name: "data-storage",
      },
    ),
  ),
);

export const initializeFontStore = async () => {
  try {
    const defaultFont = await invoke<string>("get_default_font");
    useDataStore.getState().setFont(defaultFont);
    applyFont(defaultFont);
  } catch (e) {
    console.error("Failed to load default font:", e);
  }
};

export const applyFont = (fontName: string) => {
  document.documentElement.style.setProperty(
    "--font-family",
    `"${fontName}", sans-serif`,
  );
  document.body.style.fontFamily = `"${fontName}", sans-serif`;
};
