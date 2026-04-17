import { create } from "zustand";
import type { Activity } from "@/types/activity";

interface ToastState {
  toasts: Activity[];
  lastCreated: string | null;
  addToast: (toast: Activity) => void;
  removeToast: (id: string) => void;
  setLastCreated: (created: string) => void;
}

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  lastCreated: null,

  addToast: (toast) =>
    set((state) => ({
      toasts: [toast, ...state.toasts].slice(0, 5),
    })),

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  setLastCreated: (created) => set({ lastCreated: created }),
}));