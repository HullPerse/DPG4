import type { User } from "@/types/user";
import type { Item } from "@/types/items";

export interface UserStore {
  isAuth: boolean;
  isAdmin: boolean;
  loggedIn: boolean;
  user: User | null;
  token: string | null;

  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  clear: () => void;
  setLoggedIn: (loggedIn: boolean) => void;
  subscribeToUserUpdates: () => void;
  unsubscribeFromUserUpdates: () => void;
}

export interface WallpaperFilters {
  backgroundSize: "cover" | "contain" | "auto" | "fill" | string;
  backgroundPosition: string;
  backgroundRepeat: "no-repeat" | "repeat" | "repeat-x" | "repeat-y";
  filter: string;
  brightness: number;
  contrast: number;
  saturate: number;
  blur: number;
  hueRotate: number;
}

export interface StoreItem {
  item: Item;
  price: number;
  bought: boolean;
}

export interface DataStore {
  // State
  wallpaper: string;
  wallpaperFilters: WallpaperFilters;
  isConnected: boolean;
  isEditing: boolean;
  arrowType: "all" | "none" | "arrows" | "icons" | "ladders" | "snakes";
  userProfile: {
    type: "chat" | "profile";
    id: string;
  } | null;
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
  noAction: boolean;
  adPosition: 1 | 2 | 3 | 4;
  storeItems: StoreItem[];
  rerollPrice: number;
  negativeScoreModal: boolean;
  gamblingBanned: boolean;

  // Actions
  setWallpaperFilters: (filters: Partial<WallpaperFilters>) => void;
  setSavedWheel: (savedWheel: string[]) => void;
  setNotepad: (notepad: string) => void;
  setWallpaper: (wallpaper: string) => void;
  setConnected: (isConnected: boolean) => void;
  setEditing: (isEditing: boolean) => void;
  setNegativeScoreModal: (negativeScoreModal: boolean) => void;
  setGamblingBanned: (gamblingBanned: boolean) => void;
  setArrowType: (arrowType: "all" | "none" | "arrows" | "icons" | "ladders" | "snakes") => void;
  setUserProfile: (
    userProfile: {
      type: "chat" | "profile";
      id: string;
    } | null,
  ) => void;
  resetSessionCaches: () => void;
  setNoAction: (noAction: boolean) => void;
  setAccessToken: (accessToken: string) => void;
  setAdPosition: (adPosition: 1 | 2 | 3 | 4) => void;
  setStoreItems: (items: StoreItem[]) => void;
  setRerollPrice: (price: number) => void;
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
