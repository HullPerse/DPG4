import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { cn } from "@/lib/utils";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { type CSSProperties, type ReactNode, useMemo, useState } from "react";

interface ComboboxOption {
  value: string;
  label: ReactNode;
  style?: CSSProperties;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  size?: "sm" | "default";
}

function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select option...",
  className,
  disabled,
  size = "default",
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    if (!search) return options;
    const lowerSearch = search.toLowerCase();
    return options.filter(
      (opt) =>
        typeof opt.label === "string" &&
        opt.label.toLowerCase().includes(lowerSearch),
    );
  }, [options, search]);

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger
        disabled={disabled}
        render={
          <button
            type="button"
            className={cn(
              "gap-1.5 rounded border-2 border-text bg-card px-3 py-2 text-base font-bold text transition-all duration-200 flex w-full items-center justify-between whitespace-nowrap outline-none focus:outline-none focus:border-primary disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer select-none",
              "data-[size=default]:h-9 data-[size=sm]:h-8",
              className,
            )}
            data-size={size}
          >
            <span className="flex-1 text-left truncate">
              {selectedOption ? (
                selectedOption.label
              ) : (
                <span className="text-muted font-normal">{placeholder}</span>
              )}
            </span>
            <ChevronDownIcon className="text-text size-4 pointer-events-none shrink-0" />
          </button>
        }
      />

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner
          side="bottom"
          sideOffset={4}
          align="start"
          alignOffset={0}
          className="isolate z-9999"
        >
          <PopoverPrimitive.Popup
            className={cn(
              "bg-card text-text data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 ring-highlight-high min-w-36 rounded shadow-md ring-2 duration-100 relative isolate z-9999 max-h-(--available-height) w-(--anchor-width) origin-(--transform-origin) overflow-x-hidden overflow-y-auto",
              className,
            )}
          >
            <div className="p-1">
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={cn(
                  "flex h-8 w-full rounded border-2 border-border bg-input px-3 py-2 text-sm font-bold text",
                  "placeholder:text-muted placeholder:font-normal",
                  "focus:outline-none focus:border-primary",
                  "mb-1",
                )}
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            <div className="max-h-60 overflow-y-auto overflow-x-hidden p-1">
              {filteredOptions.length === 0 ? (
                <div className="py-2 px-1.5 text-sm text-muted font-normal">
                  No results found.
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange?.(option.value);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={cn(
                      "focus:bg-primary/20 focus:text-text gap-1.5 rounded py-1 pr-8 pl-1.5 text-sm font-bold relative flex w-full items-center outline-hidden select-none data-disabled:pointer-events-none cursor-pointer data-disabled:opacity-50 hover:bg-primary/10 transition-colors duration-200 text-left",
                      value === option.value && "bg-primary/20",
                    )}
                    style={option.style}
                  >
                    <span className="flex flex-1 gap-2 shrink-0 whitespace-nowrap">
                      {option.label}
                    </span>
                    {value === option.value && (
                      <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
                        <CheckIcon className="pointer-events-none" />
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

export { Combobox, type ComboboxOption, type ComboboxProps };
