import { useEffect, useState } from "react";

export default function Timer() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center justify-center px-4 h-full w-26 bg-card/50 backdrop-blur-sm border-l-2 border-highlight-high">
      <div className="flex flex-col items-center">
        <span className="text-sm font-bold text-text tabular-nums">
          {time.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        <span className="text-xs text-muted-foreground">
          {time.toLocaleDateString([], {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>
    </div>
  );
}
