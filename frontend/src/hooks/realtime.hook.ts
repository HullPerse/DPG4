import { useCallback, useEffect, useRef } from "react";
import { subscribeWsChannel } from "@/lib/ws.client";

export function useRealtime(
  channel: string,
  callback: () => void,
  options: {
    debounceMs?: number;
    enabled?: boolean;
  } = {},
) {
  const { debounceMs = 0, enabled = true } = options;
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trigger = useCallback(() => {
    if (debounceMs > 0) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => callbackRef.current(), debounceMs);
    } else {
      callbackRef.current();
    }
  }, [debounceMs]);

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = subscribeWsChannel(channel, () => trigger());

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      unsubscribe();
    };
  }, [channel, enabled, trigger]);

}
