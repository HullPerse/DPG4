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
        "flex h-full w-26 cursor-pointer items-center justify-center border-l-2 border-highlight-high px-4 transition-all duration-200 hover:bg-white/5",
        className,
      )}
      data-timer="true"
      onClick={handleClick}
    >
      <div className="flex flex-col items-center">
        <TimeDisplay time={time} />
      </div>
    </div>
  );
});
