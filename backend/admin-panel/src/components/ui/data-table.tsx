import { type ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Scrollable table region: grows within a flex column but never exceeds the viewport. */
export function DataTable({
  className,
  children,
  maxHeight,
}: ComponentProps<"div"> & { maxHeight?: string }) {
  return (
    <div
      className={cn(
        "border-highlight-high flex min-h-0 flex-1 flex-col border-2",
        className,
      )}
      style={maxHeight ? { maxHeight } : undefined}
    >
      <div className="min-h-0 flex-1 overflow-auto overscroll-contain">
        {children}
      </div>
    </div>
  );
}

export function DataTableElement({
  className,
  ...props
}: ComponentProps<"table">) {
  return (
    <table
      className={cn("w-full min-w-max text-sm", className)}
      {...props}
    />
  );
}

export function DataTableHead({
  className,
  ...props
}: ComponentProps<"thead">) {
  return (
    <thead
      className={cn(
        "bg-highlight-low text-muted sticky top-0 z-10 text-left text-xs uppercase",
        className,
      )}
      {...props}
    />
  );
}
