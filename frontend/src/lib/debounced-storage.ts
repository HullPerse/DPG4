import type { StateStorage } from "zustand/middleware";

export function createDebouncedStorage(
  storage: Storage,
  debounceMs: number,
): StateStorage {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let pending: { name: string; value: string } | null = null;

  const flush = () => {
    if (pending) {
      storage.setItem(pending.name, pending.value);
      pending = null;
    }
    timeout = null;
  };

  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", flush);
  }

  return {
    getItem: (name) => storage.getItem(name),
    setItem: (name, value) => {
      pending = { name, value };
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(flush, debounceMs);
    },
    removeItem: (name) => {
      if (timeout) clearTimeout(timeout);
      pending = null;
      storage.removeItem(name);
    },
  };
}
