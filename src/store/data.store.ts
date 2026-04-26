import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";
import { invoke } from "@tauri-apps/api/core";
import type { DataStore } from "@/types/store";

export const useDataStore = create<DataStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        wallpaper: "",
        font: "",
        isConnected: false,
        isEditing: false,
        arrowType: "all",
        userProfile: null,
        movingUser: null,
        savedWheel: [],
        notepad: "",
        accessToken: "",

        setSavedWheel: (savedWheel: string[]) => {
          set({ savedWheel });
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
            font: "",
            isConnected: false,
            isEditing: false,
            arrowType: "all",
            userProfile: null,
            movingUser: null,
            savedWheel: [],
            notepad: "",
            accessToken: "",
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
      },
    ),
  ),
);

export const initializeFontStore = async () => {
  try {
    const storedFont = useDataStore.getState().font;
    if (storedFont) {
      applyFont(storedFont);
      return;
    }
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
