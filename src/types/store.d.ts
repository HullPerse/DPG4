import type { User } from "@/types/user";

export interface UserStore {
  // State
  isAuth: boolean;
  isAdmin: boolean;
  loggedIn: boolean;
  user: User | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  clear: () => void;
  setLoggedIn: (loggedIn: boolean) => void;
  subscribeToUserUpdates: () => void;
  unsubscribeFromUserUpdates: () => void;
}

export interface DataStore {
  // State
  wallpaper: string;
  font: string;
  isConnected: boolean;
  isEditing: boolean;
  arrowType: "all" | "none" | "arrows" | "icons" | "ladders" | "snakes";
  userProfile: string | null;
  savedWheel: string[];
  movingUser: {
    userId: string;
    fromPosition: number;
    toPosition: number;
    path: number[];
    currentStep: number;
    isAnimating: boolean;
    finalPosition: number;
  } | null;
  accessToken: string;
  notepad: string;

  // Actions
  setSavedWheel: (savedWheel: string[]) => void;
  setNotepad: (notepad: string) => void;
  setWallpaper: (wallpaper: string) => void;
  setFont: (font: string) => void;
  setConnected: (isConnected: boolean) => void;
  setEditing: (isEditing: boolean) => void;
  setArrowType: (
    arrowType: "all" | "none" | "arrows" | "icons" | "ladders" | "snakes",
  ) => void;
  setUserProfile: (userProfile: string | null) => void;
  setAccessToken: (accessToken: string) => void;
  startMoving: (
    userId: string,
    fromPosition: number,
    toPosition: number,
    finalPosition: number,
    path: number[],
  ) => void;
  nextStep: () => void;
  finishMoving: () => void;
}
