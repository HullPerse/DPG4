import {
  ChevronDown,
  ChevronUp,
  EyeIcon,
  EyeOffIcon,
  InfinityIcon,
} from "lucide-react";
import { ChangeEvent, type ComponentProps, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function Input({
  className,
  type,
  value = "",
  arrows,
  amount,
  onChange,
  ...props
}: ComponentProps<"input"> & { arrows?: boolean; amount?: boolean }) {
  const [visiblePassword, setVisiblePassword] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [internalValue, setInternalValue] = useState(value);
  const inputValue = value !== undefined ? value : internalValue;

  const getType = () => {
    if (type === "password") {
      return visiblePassword ? "text" : "password";
    }
    return type;
  };

  const inputType = getType();

  return (
    <div className="relative w-full">
      <input
        ref={props.ref || inputRef}
        className={cn(
          "border-iris bg-background text-text flex h-11 w-full border-2 px-4 py-2 text-base font-bold",
          "placeholder:font-normal placeholder:text-muted",
          "focus:border-primary focus:outline-none",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          "transition-all duration-200",

          "file:text file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-bold",

          inputType === "number" &&
            "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          className,
        )}
        type={inputType}
        value={inputValue}
        onChange={(e) => {
          if (onChange) {
            onChange(e);
          }
          if (value === undefined) {
            setInternalValue(e.target.value);
          }
        }}
        {...props}
      />

      {arrows && (
        <div
          className={`absolute top-1 right-2 flex flex-col items-center justify-center text-gray-400`}
          aria-hidden={props.disabled ? "true" : "false"}
        >
          <button
            type="button"
            className="cursor-pointer hover:text-gray-200 disabled:cursor-not-allowed"
            onClick={() => {
              const newValue = (() => {
                const current = Number(inputValue) || 0;
                const next = current + 1;
                const min = Number(props.min);
                const max = Number(props.max);

                if (!isNaN(min) && next < min) return String(min);
                if (!isNaN(max) && next > max) return String(max);
                return String(next);
              })();

              if (onChange) {
                const syntheticEvent = {
                  target: { value: newValue },
                } as ChangeEvent<HTMLInputElement>;
                onChange(syntheticEvent);
              }
              if (value === undefined) {
                setInternalValue(newValue);
              }
            }}
            disabled={props.disabled}
            aria-label="Increase number"
          >
            <ChevronUp size={18} />
          </button>
          <button
            type="button"
            className="cursor-pointer hover:text-gray-200 disabled:cursor-not-allowed"
            onClick={() => {
              const newValue = (() => {
                const current = Number(inputValue) || 0;
                const next = current - 1;
                const min = Number(props.min);
                const max = Number(props.max);

                if (!isNaN(min) && next < min) return String(min);
                if (!isNaN(max) && next > max) return String(max);
                return String(next);
              })();

              if (onChange) {
                const syntheticEvent = {
                  target: { value: newValue },
                } as ChangeEvent<HTMLInputElement>;
                onChange(syntheticEvent);
              }
              if (value === undefined) {
                setInternalValue(newValue);
              }
            }}
            disabled={props.disabled}
            aria-label="Decrease number"
          >
            <ChevronDown size={18} />
          </button>
        </div>
      )}

      {type === "password" && (
        <button
          type="button"
          tabIndex={-1}
          className={cn(
            "hover:text absolute right-3 cursor-pointer text-muted transition-colors",
            props.min || props.max ? "top-1/4" : "top-1/2 -translate-y-1/2",
          )}
          onClick={() => setVisiblePassword((value) => !value)}
          disabled={props.disabled}
        >
          {visiblePassword ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
        </button>
      )}

      {(props.min || props.max) && amount && (
        <div
          className={cn(
            "absolute right-2 bottom-1 inline-flex items-center gap-0.5 text-xs font-bold text-muted",
            type === "password" && "right-2",
          )}
        >
          <span
            style={{
              color:
                props.min !== undefined &&
                String(inputValue).length < Number(props.min)
                  ? "var(--color-error)"
                  : "var(--color-success)",
            }}
          >
            {String(inputValue).length}
          </span>
          <span>/</span>
          <span>{props.max ?? <InfinityIcon className="h-3 w-3" />}</span>
        </div>
      )}
    </div>
  );
}
