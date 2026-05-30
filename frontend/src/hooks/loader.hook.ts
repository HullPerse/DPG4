import { useState, useEffect } from "react";

export default function useLoading(isLoading: boolean, minMs: number = 300) {
  const [showLoader, setShowLoader] = useState(false);
  const [startTime, setStartTime] = useState(0);

  useEffect(() => {
    if (isLoading) {
      setStartTime(Date.now());
      setShowLoader(true);
    } else if (showLoader) {
      const elapsed = Date.now() - startTime;
      const remaining = minMs - elapsed;
      if (remaining > 0) {
        const timer = setTimeout(() => setShowLoader(false), remaining);
        return () => clearTimeout(timer);
      }
      setShowLoader(false);
    }
  }, [isLoading, showLoader, startTime, minMs]);

  return showLoader;
}
