import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { cn } from "@/lib/utils";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { type CSSProperties, type ReactNode, useMemo, useState } from "react";
import { SmallLoader } from "../shared/loader.component";

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
  loading?: boolean;
}

function Combobox({
  options,
  value,
  onChange,
  placeholder = "Выберите опцию...",
  className,
  disabled,
  size = "default",
  loading,
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
              "text flex w-full cursor-pointer items-center justify-between gap-1.5 rounded border-2 border-highlight-high bg-card px-3 py-2 text-base font-bold whitespace-nowrap transition-all duration-200 outline-none select-none focus:border-primary focus:outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
              "data-[size=default]:h-9 data-[size=sm]:h-8",
              className,
            )}
            data-size={size}
          >
            <span className="flex-1 truncate text-left">
              {selectedOption ? (
                selectedOption.label
              ) : (
                <span className="font-normal text-muted">{placeholder}</span>
              )}
            </span>
            <ChevronDownIcon className="pointer-events-none size-4 shrink-0 text-text" />
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
              "data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 relative isolate z-9999 max-h-(--available-height) w-(--anchor-width) min-w-36 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded bg-card text-text shadow-md ring-2 ring-highlight-high duration-100",
              className,
            )}
          >
            <div className="p-1">
              <input
                type="text"
                placeholder="Поиск..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={cn(
                  "border-border bg-input text flex h-8 w-full rounded border-2 px-3 py-2 text-sm font-bold",
                  "placeholder:font-normal placeholder:text-muted",
                  "focus:border-primary focus:outline-none",
                  "mb-1",
                )}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            {loading ? (
              <div className="flex h-full w-full items-center justify-center p-6">
                <SmallLoader size={24} />
              </div>
            ) : (
              <div className="max-h-60 overflow-x-hidden overflow-y-auto p-1">
                {filteredOptions.length === 0 ? (
                  <div className="px-1.5 py-2 text-sm font-normal text-muted">
                    Нет результатов.
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
                        "relative flex w-full cursor-pointer items-center gap-1.5 rounded py-1 pr-8 pl-1.5 text-left text-sm font-bold outline-hidden transition-colors duration-200 select-none hover:bg-primary/10 focus:bg-primary/20 focus:text-text data-disabled:pointer-events-none data-disabled:opacity-50",
                        value === option.value && "bg-primary/20",
                      )}
                      style={option.style}
                    >
                      <span className="flex flex-1 shrink-0 gap-2 whitespace-nowrap">
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
            )}
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

export { Combobox, type ComboboxOption, type ComboboxProps };
