import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";
import type { DataStore } from "@/types/store";

export const useDataStore = create<DataStore>()(
  subscribeWithSelector(
    persist(
      (set) => ({
        wallpaper: "",
        font: "",
        isConnected: false,
        isEditing: false,

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
      }),
      {
        name: "data-storage",
      },
    ),
  ),
);
