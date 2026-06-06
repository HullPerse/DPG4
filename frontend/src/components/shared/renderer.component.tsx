import { WheelItem } from "@/types/wheel";
import Image from "./image.component";

export default function renderWheelItems(
  items: WheelItem[],
  isRolling: boolean,
  hasRolled: boolean,
  highlightedIndex: number | null,
  onResult: (item: WheelItem | null) => void,
) {
  const handleClick = (item: WheelItem) => {
    if (isRolling) return;

    return onResult(item);
  };

  const isInteractive = !isRolling;

  return items.map((item, index) => {
    const isHighlighted = highlightedIndex === index;
    const isWinner = isHighlighted && hasRolled && !isRolling;

    return (
    <button
      role="button"
      key={`${item.id}-${index}`}
      type="button"
      className={`relative shrink-0 w-32 h-32 mx-2 flex flex-col items-center justify-center font-bold border-2 rounded transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
        isWinner
          ? "z-10 scale-110 bg-primary/35 border-primary text-primary ring-2 ring-primary shadow-lg"
          : isHighlighted
            ? "z-10 scale-105 bg-primary/20 border-primary text-primary ring-1 ring-primary/60"
            : "border-highlight-high text-primary"
      } ${
        isInteractive
          ? "cursor-pointer hover:bg-primary/10"
          : isHighlighted
            ? "cursor-not-allowed"
            : "cursor-not-allowed opacity-60"
      }`}
      onClick={() => handleClick(item)}
      disabled={isRolling}
      aria-disabled={isRolling}
      aria-current={isWinner ? "true" : undefined}
      tabIndex={isInteractive ? 0 : -1}
    >
      {item.type === "image" && item.image && (
        <Image
          src={item.image}
          alt={item.label}
          loading="lazy"
          className="w-10 h-10 object-contain mb-1"
        />
      )}

      {item.type === "emoji" && (
        <span className="w-10 h-10 mb-1">{item.image}</span>
      )}
      <div className="text-xs font-medium text-center px-1 line-clamp-1">
        {item.label}
      </div>
    </button>
    );
  });
}
