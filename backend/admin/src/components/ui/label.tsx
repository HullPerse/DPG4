import { type ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Label({ className, ...props }: ComponentProps<"label">) {
  return (
    <label
      className={cn("text-muted mb-1.5 block text-xs font-bold uppercase tracking-wide", className)}
      {...props}
    />
  );
}
