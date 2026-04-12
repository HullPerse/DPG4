import { getCenteredItem } from "@/lib/wheel.utils";
import { WheelItem } from "@/types/wheel";
import { RefObject } from "react";
import Image from "./image.component";

export default function renderWheelItems(
  containerRef: RefObject<HTMLDivElement>,
  scrollPosition: number,
  items: WheelItem[],
  itemWidth: number,
  isRolling: boolean,
  onResult: (item: WheelItem) => void,
) {
  const handleClick = (item: WheelItem) => {
    if (isRolling) return;

    return onResult(item);
  };

  const containerWidth = containerRef?.current?.offsetWidth ?? 0;
  const centeredIndex = getCenteredItem(
    scrollPosition,
    containerWidth,
    items.length,
    itemWidth,
  );

  return items.map((item, index) => {
    const isNearCenter = index === centeredIndex;
    const isInteractive = !isRolling;

    return (
      <button
        key={`${item.id}-${index}`}
        type="button"
        className={`relative shrink-0 w-32 h-32 mx-2 flex flex-col items-center justify-center text-primary font-bold border rounded transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
          isNearCenter
            ? "bg-primary/20 border-primary glow-text scale-105"
            : "border-muted/30"
        } ${
          isInteractive
            ? "cursor-pointer hover:bg-primary/10"
            : "cursor-not-allowed opacity-60"
        }`}
        onClick={() => handleClick(item)}
        disabled={isRolling}
        aria-disabled={isRolling}
        tabIndex={isInteractive ? 0 : -1}
      >
        {item.image && (
          <Image
            src={item.image}
            alt={item.label}
            loading="lazy"
            className="w-10 h-10 object-contain mb-1 rounded"
          />
        )}
        <div className="text-xs font-medium text-center px-1 line-clamp-1">
          {item.label}
        </div>
      </button>
    );
  });
}
