import type { RecordSubscription } from "pocketbase";
import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";
import { client } from "@/api/client.api";
import type { UserStore } from "@/types/store";
import type { User } from "@/types/user";

const usersCollection = client.collection("users");

const handleUserUpdate = (
  data: RecordSubscription<User>,
  set: (state: Partial<UserStore>) => void,
  get: () => UserStore,
) => {
  if (data.action === "update" && data.record) {
    set({
      user: data.record,
      isAdmin: data.record.isAdmin,
    });
  } else if (data.action === "delete") {
    get().clear();
  }
};

export const useUserStore = create<UserStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        isAuth: false,
        isAdmin: false,
        loggedIn: false,
        user: null,

        setLoggedIn: (loggedIn: boolean) => {
          set({ loggedIn });
        },

        subscribeToUserUpdates: () => {
          const { user } = get();
          if (!user?.id) return;

          usersCollection.subscribe(
            user.id,
            (data: RecordSubscription<User>) => {
              handleUserUpdate(data, set, get);
            },
          );
        },

        unsubscribeFromUserUpdates: () => {
          const { user } = get();
          if (user?.id) {
            usersCollection.unsubscribe(user.id);
          }
        },

        login: async (username: string, password: string) => {
          const authData = await usersCollection.authWithPassword<User>(
            username,
            password,
          );

          set({
            isAuth: true,
            isAdmin: authData.record.isAdmin,
            user: authData.record,
          });

          get().subscribeToUserUpdates();
        },

        logout: async () => {
          client.authStore.clear();
          get().unsubscribeFromUserUpdates();
          get().clear();
        },

        refresh: async () => {
          await usersCollection.authRefresh();

          const isValid = client.authStore.isValid;
          const isAdmin = client.authStore.record?.isAdmin || false;
          const user = client.authStore.record as User | null;

          set({
            isAuth: isValid,
            isAdmin: isAdmin,
            user,
          });

          if (isValid && user) {
            get().subscribeToUserUpdates();
          }
        },

        clear: () => {
          set({
            isAuth: false,
            isAdmin: false,
            user: null,
          });
        },
      }),
      {
        name: "auth-storage",
        partialize: (state) => ({
          token: client.authStore.token,
          loggedIn: state.loggedIn,
        }),
        onRehydrateStorage: () => {
          return (_, error) => {
            if (error) {
              console.error("Error rehydrating auth store:", error);
              return;
            }
          };
        },
      },
    ),
  ),
);

export const initializeAuthStore = async () => {
  await new Promise((resolve) => setTimeout(resolve, 100));

  const isAuth = client.authStore.isValid;
  const isAdmin = client.authStore.record?.isAdmin || false;
  const user = client.authStore.record as User | null;

  useUserStore.setState({
    isAuth,
    isAdmin,
    user,
  });

  client.authStore.onChange(() => {
    const isAuth = client.authStore.isValid;
    const isAdmin = client.authStore.record?.isAdmin || false;
    const user = client.authStore.record as User | null;

    useUserStore.setState({
      isAuth,
      isAdmin,
      user,
    });

    if (isAuth && user) {
      useUserStore.getState().subscribeToUserUpdates();
    } else {
      useUserStore.getState().unsubscribeFromUserUpdates();
    }
  });

  if (isAuth && user) {
    try {
      await useUserStore.getState().refresh();
    } catch (error) {
      console.error("Auth refresh failed:", error);
      useUserStore.getState().clear();
    }
  }
};
