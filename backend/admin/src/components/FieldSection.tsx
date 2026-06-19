import { cn } from "@/lib/utils";

export type FieldVariant = "default" | "json" | "list" | "media" | "select";

const variantClass: Record<FieldVariant, string> = {
  default: "border-highlight-high bg-card/50",
  json: "border-iris/50 bg-iris/5",
  list: "border-primary/40 bg-primary/5",
  media: "border-iris/30 bg-highlight-low",
  select: "border-iris/40 bg-card",
};

export function FieldBadge({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "primary" | "iris" | "changed";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase",
        tone === "muted" && "bg-highlight-medium text-muted",
        tone === "primary" && "bg-primary/20 text-primary",
        tone === "iris" && "bg-iris/20 text-iris",
        tone === "changed" && "bg-primary/30 text-primary",
      )}
    >
      {children}
    </span>
  );
}

export function ValueChip({ value, label }: { value: string; label?: string }) {
  return (
    <span className="bg-iris/15 text-iris border-iris/40 inline-block max-w-full truncate border px-2 py-0.5 text-xs font-bold">
      {label ?? value}
    </span>
  );
}

export function FieldSection({
  title,
  hint,
  variant = "default",
  changed,
  badge,
  children,
  className,
}: {
  title: string;
  hint?: string;
  variant?: FieldVariant;
  changed?: boolean;
  badge?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "mb-5 border-2 p-4 transition-colors",
        variantClass[variant],
        changed && "border-primary/70 shadow-sharp-sm",
        className,
      )}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold">{title}</span>
        {badge && <FieldBadge tone="iris">{badge}</FieldBadge>}
        {changed && <FieldBadge tone="changed">изменено</FieldBadge>}
      </div>
      {hint && <p className="text-muted -mt-1 mb-3 text-xs">{hint}</p>}
      {children}
    </section>
  );
}

export function isFieldChanged(
  current: unknown,
  original: unknown | undefined,
): boolean {
  if (original === undefined) return false;
  return JSON.stringify(current ?? null) !== JSON.stringify(original ?? null);
}
