import { cn } from "@/lib/utils";
import { Box } from "lucide-react";

export function Spinner({
  size,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Box
      className={cn("animate-spin shrink-0", className)}
      style={{ width: size ?? 16, height: size ?? 16 }}
    />
  );
}
