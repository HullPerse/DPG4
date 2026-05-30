import { create } from "zustand";
import { createJSONStorage, persist, subscribeWithSelector } from "zustand/middleware";
import type { DataStore, StoreItem, WheelHistoryItem } from "@/types/store";
import { createDebouncedStorage } from "@/lib/debounced-storage";

export const useDataStore = create<DataStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        wallpaper: "",
        wallpaperFilters: {
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          filter: "none",
          brightness: 100,
          contrast: 100,
          saturate: 100,
          blur: 0,
          hueRotate: 0,
        },
        isConnected: false,
        isEditing: false,
        arrowType: "all",
        userProfile: null,
        movingUser: null,
        savedWheel: [],
        wheelHistory: [],
        notepad: "",
        accessToken: "",
        noAction: false,
        adPosition: 1,
        storeItems: [],
        rerollPrice: 2,
        negativeScoreModal: false,

        setNegativeScoreModal: (negativeScoreModal: boolean) => {
          set({ negativeScoreModal });
        },

        setSavedWheel: (savedWheel: string[]) => {
          set({ savedWheel });
        },

        setWheelHistory: (wheelHistory: WheelHistoryItem[]) => {
          set({ wheelHistory });
        },

        addWheelHistory: (item: WheelHistoryItem) => {
          set((state) => ({
            wheelHistory: [item, ...state.wheelHistory],
          }));
        },

        setAdPosition: (adPosition: 1 | 2 | 3 | 4) => {
          set({ adPosition });
        },

        setStoreItems: (storeItems: StoreItem[]) => {
          set({ storeItems });
        },

        setRerollPrice: (rerollPrice: number) => {
          set({ rerollPrice });
        },

        setAccessToken: (accessToken: string) => {
          set({ accessToken });
        },

        setNotepad: (notepad: string) => {
          set({ notepad });
        },

        setWallpaper: (wallpaper: string) => {
          set({ wallpaper });
        },
        setWallpaperFilters: (
          filters: Partial<DataStore["wallpaperFilters"]>,
        ) => {
          set((state) => ({
            wallpaperFilters: { ...state.wallpaperFilters, ...filters },
          }));
        },
        setConnected: (isConnected: boolean) => {
          set({ isConnected });
        },
        setNoAction: (noAction: boolean) => {
          set({ noAction });
        },
        setEditing: (isEditing: boolean) => {
          set({ isEditing });
        },
        setArrowType: (arrowType: DataStore["arrowType"]) => {
          set({ arrowType });
        },
        setUserProfile: (
          userProfile: {
            type: "chat" | "profile";
            id: string;
          } | null,
        ) => {
          set({ userProfile });
        },

        clear: () => {
          set({
            wallpaper: "",
            wallpaperFilters: {
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              filter: "none",
              brightness: 100,
              contrast: 100,
              saturate: 100,
              blur: 0,
              hueRotate: 0,
            },
            isConnected: false,
            isEditing: false,
            arrowType: "all",
            userProfile: null,
            movingUser: null,
            savedWheel: [],
            wheelHistory: [],
            notepad: "",
            accessToken: "",
            storeItems: [],
            rerollPrice: 2,
          });
        },

        startMoving: (
          userId: string,
          fromPosition: number,
          toPosition: number,
          finalPosition: number,
          path: number[],
        ) => {
          set({
            movingUser: {
              userId,
              fromPosition,
              toPosition,
              path,
              currentStep: 0,
              isAnimating: true,
              finalPosition,
            },
          });
        },
        nextStep: () => {
          const { movingUser } = get();
          if (!movingUser) return;
          if (movingUser.currentStep >= movingUser.path.length - 1) {
            get().finishMoving();
            return;
          }
          set({
            movingUser: {
              ...movingUser,
              currentStep: movingUser.currentStep + 1,
            },
          });
        },
        finishMoving: () => {
          set({ movingUser: null });
        },
      }),
      {
        name: "data-storage",
        storage: createJSONStorage(() =>
          createDebouncedStorage(localStorage, 500),
        ),
      },
    ),
  ),
);
