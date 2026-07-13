import { useEffect, useRef, useState } from "react";

export function useContainerSize(disabled = false): [React.RefObject<HTMLDivElement | null>, { width: number; height: number }] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (disabled || !ref.current) return;
    const el = ref.current;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setSize({ width: Math.round(width), height: Math.round(height) });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [disabled]);

  return [ref, size];
}
