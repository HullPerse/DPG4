import { ChevronDown } from "lucide-react";
import { type ComponentProps } from "react";
import { cn } from "@/lib/utils";
import type { AdminChoice } from "@/types";

export function Select({
  className,
  value,
  onChange,
  options,
  placeholder = "Выберите…",
  allowEmpty = true,
  ...props
}: Omit<ComponentProps<"select">, "onChange" | "value"> & {
  value: string;
  onChange: (value: string) => void;
  options: readonly AdminChoice[] | AdminChoice[];
  placeholder?: string;
  allowEmpty?: boolean;
}) {
  return (
    <div className="relative w-full">
      <select
        className={cn(
          "border-iris bg-background text-text focus:border-primary w-full appearance-none border-2 py-2 pr-9 pl-3 text-sm font-medium outline-none",
          className,
        )}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...props}
      >
        {allowEmpty && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label ?? opt.value}
          </option>
        ))}
      </select>
      <ChevronDown
        className="text-muted pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2"
        aria-hidden
      />
    </div>
  );
}
