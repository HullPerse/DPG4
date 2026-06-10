import { cn, BORDER_WINDOW } from "@/lib/utils";
import { netColorClass } from "@/lib/gambling/stats.constants";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button.component";

type FilterOption<T> = { value: T; label: string };

export function FilterChipGroup<T extends string | undefined>({
  options,
  value,
  onChange,
  className,
}: {
  options: readonly FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-row flex-wrap gap-1.5", className)}>
      {options.map((opt) => (
        <Button
          key={opt.label}
          onClick={() => onChange(opt.value)}
          className="w-28"
          disabled={value === opt.value}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}

export function Panel({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        BORDER_WINDOW,
        "flex flex-col gap-2 bg-card/40 p-3",
        className,
      )}
    >
      <header className="flex items-center gap-2 text-sm font-bold text-muted">
        {Icon && <Icon className="size-4 text-iris" />}
        {title}
      </header>
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  color,
  icon: Icon,
}: {
  label: string;
  value: string;
  color?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className={cn(BORDER_WINDOW, "flex flex-col gap-1 bg-card/40 p-3")}>
      <div className="flex items-center gap-1.5 text-xs text-muted">
        {Icon && <Icon className="size-3.5 shrink-0" />}
        <span>{label}</span>
      </div>
      <span
        className={cn("text-xl font-bold tabular-nums", color ?? "text-text")}
      >
        {value}
      </span>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  message,
}: {
  icon: LucideIcon | null;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted">
      {Icon && <Icon className="size-12 opacity-40" />}
      <p className="text-sm">{message}</p>
    </div>
  );
}

export function NetValue({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <span
      className={cn("font-bold tabular-nums", netColorClass(value), className)}
    >
      {value >= 0 ? "+" : ""}
      {value}
    </span>
  );
}

export function WinRateBar({ wins, total }: { wins: number; total: number }) {
  const rate = total > 0 ? (wins / total) * 100 : 0;

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="h-1.5 flex-1 bg-highlight-low border border-highlight-high overflow-hidden">
        <div
          className="h-full bg-emerald-400/80 transition-all"
          style={{ width: `${rate}%` }}
        />
      </div>
      <span className="text-[10px] text-muted tabular-nums w-7 text-right">
        {Math.round(rate)}%
      </span>
    </div>
  );
}
