import { type ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "border-highlight-high bg-card text-text border-2 p-4 shadow-sharp-sm",
        className,
      )}
      {...props}
    />
  );
}
