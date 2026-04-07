import { useCallback, useEffect, useRef } from "react";
import { client } from "@/api/client.api";

export function useSubscription(
  collection: string,
  filter: string,
  callback: () => void,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    debounceMs?: number;
    enabled?: boolean;
  } = {},
) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    debounceMs = 100,
    enabled = true,
  } = options;

  const stateRef = useRef({
    isMounted: true,
    unsubscribe: null as (() => void) | null,
    retryTimeout: null as ReturnType<typeof setTimeout> | null,
    debounceTimeout: null as ReturnType<typeof setTimeout> | null,
    isSubscribing: false,
  });

  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const triggerCallback = useCallback(() => {
    if (!stateRef.current.isMounted) return;

    if (debounceMs > 0) {
      if (stateRef.current.debounceTimeout) {
        clearTimeout(stateRef.current.debounceTimeout);
      }

      stateRef.current.debounceTimeout = setTimeout(() => {
        if (stateRef.current.isMounted) {
          callbackRef.current();
        }
      }, debounceMs);
    } else {
      callbackRef.current();
    }
  }, [debounceMs]);

  const cleanup = useCallback(() => {
    const state = stateRef.current;

    if (state.retryTimeout) {
      clearTimeout(state.retryTimeout);
      state.retryTimeout = null;
    }

    if (state.debounceTimeout) {
      clearTimeout(state.debounceTimeout);
      state.debounceTimeout = null;
    }

    if (state.unsubscribe) {
      try {
        state.unsubscribe();
      } catch (error) {
        console.error(`Error unsubscribing from ${collection}:`, error);
      }
      state.unsubscribe = null;
    }

    state.isSubscribing = false;
  }, [collection]);

  const subscribe = useCallback(
    async (retryCount = 0): Promise<void> => {
      const state = stateRef.current;

      if (!enabled || !state.isMounted || state.isSubscribing) {
        return;
      }

      state.isSubscribing = true;

      try {
        cleanup();

        if (!state.isMounted) {
          state.isSubscribing = false;
          return;
        }

        const unsubscribe = await client
          .collection(collection)
          .subscribe(filter, triggerCallback);

        if (state.isMounted) {
          state.unsubscribe = unsubscribe;
        } else {
          unsubscribe();
        }
      } catch (error) {
        console.error(
          `Subscription failed for ${collection}:${filter} (${retryCount + 1}/${maxRetries})`,
          error,
        );

        if (retryCount < maxRetries && state.isMounted && enabled) {
          const delay = Math.min(retryDelay * 2 ** retryCount, 10000);

          state.retryTimeout = setTimeout(() => {
            void subscribe(retryCount + 1);
          }, delay);
        }
      } finally {
        state.isSubscribing = false;
      }
    },
    [
      collection,
      filter,
      enabled,
      maxRetries,
      retryDelay,
      cleanup,
      triggerCallback,
    ],
  );

  useEffect(() => {
    stateRef.current.isMounted = true;

    if (enabled) {
      void subscribe();
    }

    return () => {
      stateRef.current.isMounted = false;
      cleanup();
    };
  }, [enabled, subscribe, cleanup]);
}
