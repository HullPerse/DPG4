import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";
import type { DataStore } from "@/types/store";

export const useDataStore = create<DataStore>()(
  subscribeWithSelector(
    persist(
      (set) => ({
        wallpaper: "",
        isConnected: false,

        setWallpaper: (wallpaper: string) => {
          set({ wallpaper });
        },
        setConnected: (isConnected: boolean) => {
          set({ isConnected });
        },
      }),
      {
        name: "data-storage",
      },
    ),
  ),
);
