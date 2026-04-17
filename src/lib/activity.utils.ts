import { client } from "@/api/client.api";
import { useToastStore } from "@/store/toast.store";
import type { Activity } from "@/types/activity";

let isInitialized = false;

export async function initActivitySubscription() {
  if (isInitialized) return;
  isInitialized = true;

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
  isInitialized = false;
}