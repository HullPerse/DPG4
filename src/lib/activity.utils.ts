import { client } from "@/api/client.api";
import { useToastStore } from "@/store/toast.store";
import { useUserStore } from "@/store/user.store";
import type { Activity } from "@/types/activity";

let isChatInitialized = false;
let isActivityInitialized = false;

export async function initActivitySubscription() {
  if (isActivityInitialized) return;
  isActivityInitialized = true;

  const activityCollection = client.collection("activity");

  try {
    const initialActivities = await activityCollection.getList(1, 1, {
      sort: "-created",
    });

    if (initialActivities.items.length > 0) {
      const latestActivity = initialActivities.items[0] as unknown as Activity;
      useToastStore.getState().setLastCreated(latestActivity.created);
    }
  } catch {
    console.warn("Activity collection not available yet");
  }

  activityCollection.subscribe("*", async (e) => {
    if (e.action === "create") {
      const newActivity = e.record as unknown as Activity;
      const lastCreated = useToastStore.getState().lastCreated;

      if (lastCreated && newActivity.created > lastCreated) {
        useToastStore.getState().setLastCreated(newActivity.created);
        useToastStore.getState().addToast(newActivity);
      }
    }
  });
}

export function cleanupActivitySubscription() {
  client.collection("activity").unsubscribe("*");
}

export async function initChatSubscription() {
  if (isChatInitialized) return;
  isChatInitialized = true;

  const chatsCollection = client.collection("chats");

  chatsCollection.subscribe("*", async (e) => {
    if (e.action === "create") {
      const newChat = e.record;
      const currentUser = useUserStore.getState().user;
      const receiverId = newChat.data?.receiver?.id;

      if (currentUser?.id && receiverId === currentUser.id) {
        const senderName = newChat.data?.sender?.username || "Неизвестный";
        const message = newChat.message || "Новое сообщение";

        const toast: Activity = {
          id: crypto.randomUUID(),
          text: `${senderName}: ${message}`,
          type: "chat",
          image: newChat.data?.sender?.avatar,
          created: new Date().toISOString(),
        };

        useToastStore.getState().addToast(toast);
      }
    }
  });
}

export function cleanupChatSubscription() {
  client.collection("chats").unsubscribe("*");
  isChatInitialized = false;
}