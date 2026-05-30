import { Eye, EyeOff } from "lucide-react";
import { type ComponentProps, useState } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, type, ...props }: ComponentProps<"input">) {
  const [show, setShow] = useState(false);
  const inputType = type === "password" ? (show ? "text" : "password") : type;

  return (
    <div className="relative w-full">
      <input
        className={cn(
          "border-iris bg-background text-text flex h-10 w-full border-2 px-3 py-2 text-sm font-medium",
          "placeholder:text-muted placeholder:font-normal",
          "focus:border-primary focus:outline-none",
          "disabled:opacity-50",
          className,
        )}
        type={inputType}
        {...props}
      />
      {type === "password" && (
        <button
          type="button"
          tabIndex={-1}
          className="absolute top-1/2 right-3 -translate-y-1/2 text-muted hover:text-text"
          onClick={() => setShow((v) => !v)}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      )}
    </div>
  );
}
