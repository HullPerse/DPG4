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

export interface WheelHistoryItem {
  id: string;
  label: string;
  image: string;
  type: "image" | "emoji";
  timestamp: string;
}

export interface DataStore {
  // State
  wallpaper: string;
  font: string;
  isConnected: boolean;
  isEditing: boolean;
  arrowType: "all" | "none" | "arrows" | "icons" | "ladders" | "snakes";
  userProfile: {
    type: "chat" | "profile";
    id: string;
  } | null;
  savedWheel: string[];
  wheelHistory: WheelHistoryItem[];
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
  noAction: boolean;

  // Actions
  setSavedWheel: (savedWheel: string[]) => void;
  setWheelHistory: (wheelHistory: WheelHistoryItem[]) => void;
  addWheelHistory: (item: WheelHistoryItem) => void;
  setNotepad: (notepad: string) => void;
  setWallpaper: (wallpaper: string) => void;
  setFont: (font: string) => void;
  setConnected: (isConnected: boolean) => void;
  setEditing: (isEditing: boolean) => void;
  setArrowType: (
    arrowType: "all" | "none" | "arrows" | "icons" | "ladders" | "snakes",
  ) => void;
  setUserProfile: (
    userProfile: {
      type: "chat" | "profile";
      id: string;
    } | null,
  ) => void;
  setNoAction: (noAction: boolean) => void;
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
  clear: () => void;
}
