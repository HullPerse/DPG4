import { apiFetch } from "@/api/client.api";
import { useToastStore } from "@/store/toast.store";
import { useUserStore } from "@/store/user.store";
import type { Activity } from "@/types/activity";
import {
  subscribeWsChannel,
  ensureWsConnected,
  closeWs,
} from "@/lib/ws.client";
import {
  cleanupAdminReloadListener,
  initAdminReloadListener,
} from "@/lib/reload.utils";
import { notifyPrivateMessage } from "@/lib/notifications";
import { initCursors } from "@/lib/cursor.utils";

let activityUnsub: (() => void) | null = null;
let chatUnsub: (() => void) | null = null;

function isActivityNewer(created: string, lastCreated: string | null): boolean {
  if (!lastCreated) return true;
  return new Date(created).getTime() > new Date(lastCreated).getTime();
}

function showActivityToast(activity: Activity) {
  if (!activity.created) return;

  const lastCreated = useToastStore.getState().lastCreated;
  if (!isActivityNewer(activity.created, lastCreated)) return;

  useToastStore.getState().setLastCreated(activity.created);
  useToastStore.getState().addToast(activity);
}

export async function initActivitySubscription() {
  if (activityUnsub) return;

  try {
    const latest = await apiFetch<Activity | null>("/activity/latest");
    if (latest?.created) {
      useToastStore.getState().setLastCreated(latest.created);
    }
  } catch {
    console.warn("Activity not available yet");
  }

  activityUnsub = subscribeWsChannel("activity", (data) => {
    if (data.action !== "create" || !data.id) return;

    void apiFetch<Activity>(`/activity/${data.id}`)
      .then(showActivityToast)
      .catch(() => {});
  });
}

export function cleanupActivitySubscription() {
  activityUnsub?.();
  activityUnsub = null;
}

export async function initChatSubscription() {
  if (chatUnsub) return;

  chatUnsub = subscribeWsChannel("chats", (data) => {
    if (data.action !== "create" || !data.id) return;

    void (async () => {
      const latest = await apiFetch<{
        id: string;
        message?: string;
        data?: {
          sender?: { username?: string; avatar?: string };
          receiver?: { id?: string };
        };
      }>(`/chats/${data.id}`).catch(() => null);

      const currentUser = useUserStore.getState().user;
      if (!latest || !currentUser?.id) return;

      const receiverId = latest.data?.receiver?.id;
      if (receiverId !== currentUser.id) return;

      const senderName = latest.data?.sender?.username || "Неизвестный";
      const message = latest.message || "Новое сообщение";
      const preview = `${senderName}: ${message}`;

      useToastStore.getState().addToast({
        id: crypto.randomUUID(),
        author: latest.data?.sender?.username,
        text: preview,
        type: "chat",
        image: latest.data?.sender?.avatar,
        created: new Date().toISOString(),
      } as Activity);

      await notifyPrivateMessage("Личное сообщение", preview);
    })();
  });
}

export function cleanupChatSubscription() {
  chatUnsub?.();
  chatUnsub = null;
}

export async function initRealtimeServices() {
  ensureWsConnected();
  initAdminReloadListener();
  await initActivitySubscription();
  await initChatSubscription();
  initCursors();
}

export function cleanupRealtimeServices() {
  cleanupActivitySubscription();
  cleanupChatSubscription();
  cleanupAdminReloadListener();
  closeWs();
}
