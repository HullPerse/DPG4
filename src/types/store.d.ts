import type { User } from "@/types/user";

export interface UserStore {
  // State
  isAuth: boolean;
  user: User | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  clear: () => void;
  subscribeToUserUpdates: () => void;
  unsubscribeFromUserUpdates: () => void;
}
