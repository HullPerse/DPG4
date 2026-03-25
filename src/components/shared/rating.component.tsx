import { cn } from "@/lib/utils";
import { Star } from "lucide-react";
import { useState } from "react";

export default function Rating({
  value,
  readOnly,
  starSize = "8",
  className,
  onChange,
}: {
  value: 1 | 2 | 3 | 4 | 5;
  readOnly?: boolean;
  starSize?: string;
  className?: string;
  onChange?: (value: 1 | 2 | 3 | 4 | 5) => void;
}) {
  const [hoveredValue, setHoveredValue] = useState<number | null>(null);

  const displayValue =
    hoveredValue !== null && hoveredValue < value ? hoveredValue : value;

  const handleClick = (starValue: number) => {
    if (readOnly) return;
    onChange?.(starValue as 1 | 2 | 3 | 4 | 5);
  };

  return (
    <div className={cn("-gap-2 flex flex-row", className)}>
      {Array.from({ length: 5 }).map((_, index) => {
        return (
          <div
            key={index}
            className="z-100"
            style={{ cursor: readOnly ? "default" : "pointer" }}
            onMouseOver={() => {
              if (readOnly) return;
              setHoveredValue(index + 1);
            }}
            onMouseOut={() => {
              if (readOnly) return;
              setHoveredValue(null);
            }}
            onClick={() => handleClick(index + 1)}
          >
            <Star
              className={cn(
                `size-${starSize}`,
                hoveredValue !== null && hoveredValue > index
                  ? "fill-yellow-500 stroke-yellow-500 "
                  : "",
                displayValue > index ? "fill-yellow-500 stroke-yellow-500" : "",
              )}
            />
          </div>
        );
      })}
    </div>
  );
}
