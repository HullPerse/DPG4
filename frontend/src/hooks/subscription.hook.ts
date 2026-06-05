import { useRealtime } from "./realtime.hook";

export function useSubscription(
  collection: string,
  _filter: string,
  callback: () => void,
  options?: {
    maxRetries?: number;
    retryDelay?: number;
    debounceMs?: number;
    enabled?: boolean;
  },
) {
  return useRealtime(collection, callback, {
    debounceMs: options?.debounceMs,
    enabled: options?.enabled,
  });
}
