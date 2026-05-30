import { useEffect } from "react";
import { Download } from "lucide-react";
import { checkForUpdates, installUpdate } from "@/lib/utils";
import { useToastStore } from "@/store/toast.store";
import type { Activity, UpdateData } from "@/types/activity";

export function useAppUpdates() {
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const update = await checkForUpdates();
        if (!update || cancelled) return;

        const toastData: UpdateData = {
          id: "update",
          author: "System",
          image: "⚠️",
          type: "emoji",
          text: `Версия ${update.version} доступна для скачивания`,
          created: new Date().toISOString(),
          timeout: Infinity,
          showClose: true,
          onClick: {
            fn: () => installUpdate(update),
            icon: <Download className="size-4" />,
          },
        };

        addToast(toastData as unknown as Activity);
      } catch (e) {
        console.error("Failed to check for updates:", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [addToast]);
}
