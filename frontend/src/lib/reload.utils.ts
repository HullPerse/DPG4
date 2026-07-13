import { subscribeWsChannel } from "@/lib/ws.client";
import { useUserStore } from "@/store/user.store";
import { useDataStore } from "@/store/data.store";

export const ADMIN_RELOAD_EVENT = "dpg:admin-reload";

let adminUnsub: (() => void) | null = null;

async function applyAdminReload() {
  window.dispatchEvent(new CustomEvent(ADMIN_RELOAD_EVENT));

  const { refresh, isAuth } = useUserStore.getState();
  if (isAuth) await refresh();

  useDataStore.getState().resetSessionCaches();
}

function applyAdminLogout() {
  localStorage.clear();
  sessionStorage.clear();
  document.cookie.split(";").forEach((c) => {
    document.cookie =
      c.trim().split("=")[0] + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
  });
  useDataStore.getState().clear();
  useUserStore.getState().logout();
}

export function initAdminReloadListener() {
  if (adminUnsub) return;

  adminUnsub = subscribeWsChannel("admin", (msg) => {
    if (msg.action === "reload") {
      void applyAdminReload();
    } else if (msg.action === "force-logout") {
      applyAdminLogout();
      window.location.reload();
    }
  });
}

export function cleanupAdminReloadListener() {
  adminUnsub?.();
  adminUnsub = null;
}
