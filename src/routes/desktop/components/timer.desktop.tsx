import { useEffect, useState } from "react";

export default function Timer() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="text-sm font-medium text-text border-l-2 border-highlight-high px-2 h-full flex items-center justify-center">
      <span>
        {time.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
      <span className="text-muted ml-2">
        {time.toLocaleDateString([], {
          month: "short",
          day: "numeric",
        })}
      </span>
    </div>
  );
}
