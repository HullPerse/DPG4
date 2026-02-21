import type { User } from "@/types/user";

export interface UserStore {
  // State
  isAuth: boolean;
  isAdmin: boolean;
  user: User | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  clear: () => void;
  subscribeToUserUpdates: () => void;
  unsubscribeFromUserUpdates: () => void;
}

export interface DataStore {
  // State
  wallpaper: string;
  isConnected: boolean;
  isEditing: boolean;

  // Actions
  setWallpaper: (wallpaper: string) => void;
  setConnected: (isConnected: boolean) => void;
  setEditing: (isEditing: boolean) => void;
}
