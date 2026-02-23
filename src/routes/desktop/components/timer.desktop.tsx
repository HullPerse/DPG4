import { useEffect, useState } from "react";

export default function Timer({ onClick }: { onClick: () => void }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="flex items-center justify-center px-4 h-full w-26 border-l-2 border-highlight-high cursor-pointer hover:bg-white/5 transition-all duration-200"
      onClick={onClick}
    >
      <div className="flex flex-col items-center">
        <span className="text-sm font-bold text-text tabular-nums">
          {time.toLocaleTimeString([], {
            timeZone: "Europe/Moscow",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        <span className="text-xs text-muted-foreground">
          {time.toLocaleDateString([], {
            timeZone: "Europe/Moscow",
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>
    </div>
  );
}
