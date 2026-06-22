import { type ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Checkbox({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      type="checkbox"
      className={cn(
        "border-iris bg-background text-primary size-4 border-2 accent-primary",
        className,
      )}
      {...props}
    />
  );
}
