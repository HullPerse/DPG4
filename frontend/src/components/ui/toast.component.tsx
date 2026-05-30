import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useToastStore } from "@/store/toast.store";
import type { Activity } from "@/types/activity";
import { cn } from "@/lib/utils.tsx";
import { Button } from "./button.component";
import ImageComponent from "../shared/image.component";
import { SmallLoader } from "../shared/loader.component";

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div className="fixed bottom-4 right-4 z-9999 flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          toast={toast}
          timeout={(toast as any).timeout}
          showClose={(toast as any).showClose}
          onClick={(toast as any).onClick}
        />
      ))}
    </div>
  );
}

function Toast({
  toast,
  timeout = 10000,
  showClose = true,
  onClick,
}: {
  toast: Activity;
  timeout?: number;
  showClose?: boolean;
  onClick?: {
    fn: () => void;
    icon: React.ReactNode;
  };
}) {
  const removeToast = useToastStore((s) => s.removeToast);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (timeout === Infinity) return;

    const timer = setTimeout(() => {
      removeToast(toast.id!);
    }, timeout);

    return () => clearTimeout(timer);
  }, [toast.id, removeToast]);

  return (
    <div
      className={cn(
        "flex items-center gap-3 bg-card p-3 shadow-sharp-sm",
        "animate-toast-in min-w-70 max-w-90",
        "border border-highlight-high",
      )}
    >
      {toast.type === "image" ? (
        toast.image ? (
          <ImageComponent
            src={toast.image}
            alt="toast image"
            className="size-10 shrink-0 object-cover"
          />
        ) : null
      ) : (
        <span className="min-w-10 min-h-10 w-10 h-10 flex items-center justify-center border border-highlight-high text-xl">
          {toast.image}
        </span>
      )}
      <p className="flex-1 line-clamp-3 text-sm text-text">{toast.text}</p>
      {onClick?.fn && (
        <Button
          variant="success"
          size="icon"
          onClick={() => {
            setLoading(true);
            onClick?.fn();

            setTimeout(() => {
              setLoading(false);
            }, 2000);
          }}
        >
          {loading ? <SmallLoader /> : onClick?.icon}
        </Button>
      )}
      {showClose && (
        <Button
          variant="error"
          size="icon"
          onClick={() => removeToast(String(toast.id))}
        >
          <X className="size-4 pointer-events-none" />
        </Button>
      )}
    </div>
  );
}
