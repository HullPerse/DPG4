import { type ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "border-iris bg-background text-text min-h-[120px] w-full border-2 px-3 py-2 font-mono text-sm",
        "placeholder:text-muted focus:border-primary focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}
