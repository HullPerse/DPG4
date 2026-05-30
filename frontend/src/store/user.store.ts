import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";
import { apiFetch, getToken, setToken } from "@/api/client.api";
import type { UserStore } from "@/types/store";
import type { User } from "@/types/user";
import { subscribeWsChannel } from "@/lib/ws.client";
import { cleanupRealtimeServices } from "@/lib/activity.utils";

let userWsUnsub: (() => void) | null = null;

export const useUserStore = create<UserStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        isAuth: false,
        isAdmin: false,
        loggedIn: false,
        user: null,
        token: null,

        setLoggedIn: (loggedIn: boolean) => {
          set({ loggedIn });
        },

        subscribeToUserUpdates: () => {
          const { user } = get();
          if (!user?.id || userWsUnsub) return;

          userWsUnsub = subscribeWsChannel("users", (data) => {
            if (data.id === user.id && data.action !== "delete") {
              void get().refresh();
            }
            if (data.action === "delete" && data.id === user.id) {
              get().clear();
            }
          });
        },

        unsubscribeFromUserUpdates: () => {
          userWsUnsub?.();
          userWsUnsub = null;
        },

        login: async (username: string, password: string) => {
          const res = await apiFetch<{ token: string; user: User }>(
            "/auth/login",
            {
              method: "POST",
              body: { username, password },
              auth: false,
            },
          );

          setToken(res.token);
          set({
            isAuth: true,
            isAdmin: res.user.isAdmin ?? false,
            user: res.user,
            token: res.token,
          });

          get().subscribeToUserUpdates();
        },

        logout: async () => {
          setToken(null);
          get().unsubscribeFromUserUpdates();
          cleanupRealtimeServices();
          get().clear();
        },

        refresh: async () => {
          const token = getToken();
          if (!token) {
            get().clear();
            return;
          }

          const res = await apiFetch<{ token: string; user: User }>(
            "/auth/refresh",
            { method: "POST" },
          );

          setToken(res.token);
          set({
            isAuth: true,
            isAdmin: res.user.isAdmin ?? false,
            user: res.user,
            token: res.token,
          });

          get().subscribeToUserUpdates();
        },

        clear: () => {
          set({
            isAuth: false,
            isAdmin: false,
            user: null,
            token: null,
          });
        },
      }),
      {
        name: "auth-storage",
        partialize: (state) => ({
          token: state.token,
          loggedIn: state.loggedIn,
        }),
        onRehydrateStorage: () => (state) => {
          if (state?.token) setToken(state.token);
        },
      },
    ),
  ),
);

export const initializeAuthStore = async () => {
  await new Promise((resolve) => setTimeout(resolve, 100));

  const token = getToken();
  if (!token) return;

  try {
    const user = await apiFetch<User>("/auth/me", { timeoutMs: 5000 });
    useUserStore.setState({
      isAuth: true,
      isAdmin: user.isAdmin ?? false,
      user,
      token,
    });
    useUserStore.getState().subscribeToUserUpdates();
  } catch {
    setToken(null);
    useUserStore.getState().clear();
  }
};
