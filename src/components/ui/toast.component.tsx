import { useEffect } from "react";
import { X } from "lucide-react";
import { useToastStore } from "@/store/toast.store";
import type { Activity } from "@/types/activity";
import { image as imageConfig } from "@/api/client.api";
import { cn } from "@/lib/utils.tsx";
import { Button } from "./button.component";
import ImageComponent from "../shared/image.component";

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div className="fixed bottom-4 right-4 z-9999 flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

function Toast({ toast }: { toast: Activity }) {
  const removeToast = useToastStore((s) => s.removeToast);

  useEffect(() => {
    const timer = setTimeout(() => {
      removeToast(toast.id!);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, removeToast]);

  const imageSrc =
    toast.type === "emoji" && toast.image
      ? toast.image.startsWith("http") || toast.image.startsWith("data:")
        ? toast.image
        : `${imageConfig.game}${toast.id}/${toast.image}?thumb=100x100`
      : toast.type === "image" && toast.image && toast.id
        ? `${imageConfig.game}${toast.id}/${toast.image}?thumb=100x100`
        : null;

  return (
    <div
      className={cn(
        "flex items-center gap-3 bg-card p-3 shadow-sharp-sm",
        "animate-toast-in min-w-70 max-w-90",
        "border border-highlight-high",
      )}
    >
      {toast.type === "image" ? (
        imageSrc ? (
          <ImageComponent
            src={imageSrc}
            alt="toast image"
            className="size-10 shrink-0 object-cover"
          />
        ) : null
      ) : (
        <span className="w-10 h-10 flex items-center justify-center border border-highlight-high text-xl">
          {toast.image}
        </span>
      )}
      <p className="flex-1 truncate text-sm text-text">{toast.text}</p>
      <Button
        variant="error"
        size="icon"
        onClick={() => removeToast(String(toast.id))}
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}
