import { cn } from "@/lib/utils";
import { useEffect, useState, memo, useCallback } from "react";

export const TimeDisplay = memo(function TimeDisplay({ time }: { time: Date }) {
  return (
    <>
      <span className="text-sm font-bold text-text tabular-nums">
        {time.toLocaleTimeString([], {
          timeZone: "Europe/Moscow",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })}
      </span>
      <span className="text-xs text-muted">
        {time.toLocaleDateString([], {
          timeZone: "Europe/Moscow",
          weekday: "short",
          month: "short",
          day: "numeric",
        })}
      </span>
    </>
  );
});

export default memo(function Timer({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleClick = useCallback(() => {
    onClick();
  }, [onClick]);

  return (
    <div
      className={cn(
        "flex items-center justify-center px-4 h-full w-26 border-l-2 border-highlight-high cursor-pointer hover:bg-white/5 transition-all duration-200",
        className,
      )}
      onClick={handleClick}
    >
      <div className="flex flex-col items-center">
        <TimeDisplay time={time} />
      </div>
    </div>
  );
});
