import { cn } from "@/lib/utils";

interface BidSelectorProps {
  bidOptions: readonly number[];
  bid: number;
  onBidChange: (v: number) => void;
  disabled: boolean;
}

export function BidSelector({
  bidOptions,
  bid,
  onBidChange,
  disabled,
}: BidSelectorProps) {
  return (
    <section className="flex w-full items-center justify-center gap-1.5 border-2 border-highlight-high bg-background px-3 py-1.5">
      <span className="text-sm text-muted mr-1">Ставка</span>
      {bidOptions.map((v) => (
        <button
          key={v}
          onClick={() => onBidChange(v)}
          disabled={disabled}
          className={cn(
            "min-w-8 h-8 rounded text-sm font-semibold transition-colors cursor-pointer",
            bid === v
              ? "bg-highlight-high text-background"
              : "bg-foreground/10 text-muted hover:bg-foreground/20",
            disabled && "opacity-40 pointer-events-none",
          )}
        >
          {v}
        </button>
      ))}
    </section>
  );
}
