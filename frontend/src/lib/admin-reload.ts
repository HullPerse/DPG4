import { subscribeWsChannel } from "@/lib/ws.client";
import { useUserStore } from "@/store/user.store";
import { useDataStore } from "@/store/data.store";

export const ADMIN_RELOAD_EVENT = "dpg:admin-reload";

let adminUnsub: (() => void) | null = null;

export async function applyAdminReload() {
  window.dispatchEvent(new CustomEvent(ADMIN_RELOAD_EVENT));

  const { refresh, isAuth } = useUserStore.getState();
  if (isAuth) {
    try {
      await refresh();
    } catch {
      /* server may be restarting */
    }
  }

  useDataStore.getState().resetSessionCaches();
}

export function initAdminReloadListener() {
  if (adminUnsub) return;

  adminUnsub = subscribeWsChannel("admin", (msg) => {
    if (msg.action === "reload") {
      void applyAdminReload();
    }
  });
}

export function cleanupAdminReloadListener() {
  adminUnsub?.();
  adminUnsub = null;
}
