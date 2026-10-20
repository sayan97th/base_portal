import { useCallback, useSyncExternalStore } from "react";

type BooleanUpdate = boolean | ((previous_value: boolean) => boolean);

const listeners = new Set<() => void>();

/** Fallback for browsers where localStorage is blocked, so toggles still work for the session. */
const memory_values = new Map<string, boolean>();

function notifyListeners(): void {
  listeners.forEach((listener) => listener());
}

function handleStorageEvent(event: StorageEvent): void {
  if (event.key) memory_values.delete(event.key);
  notifyListeners();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("storage", handleStorageEvent);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", handleStorageEvent);
  };
}

function readBoolean(storage_key: string, default_value: boolean): boolean {
  const memory_value = memory_values.get(storage_key);
  if (memory_value !== undefined) return memory_value;

  try {
    const raw = localStorage.getItem(storage_key);
    if (raw === "true") return true;
    if (raw === "false") return false;
    return default_value;
  } catch {
    return default_value;
  }
}

function writeBoolean(storage_key: string, value: boolean): void {
  memory_values.set(storage_key, value);
  try {
    localStorage.setItem(storage_key, String(value));
  } catch {
    // Storage unavailable, the in memory value keeps the toggle working until reload.
  }
  notifyListeners();
}

/**
 * A boolean UI preference remembered per browser (localStorage). The server render
 * always uses `default_value`, the saved value takes over on the client, and every
 * component using the same key (in any open tab) stays in sync.
 */
export function usePersistentBoolean(storage_key: string, default_value: boolean) {
  const value = useSyncExternalStore(
    subscribe,
    () => readBoolean(storage_key, default_value),
    () => default_value
  );

  const setValue = useCallback(
    (update: BooleanUpdate) => {
      const next_value =
        typeof update === "function" ? update(readBoolean(storage_key, default_value)) : update;
      writeBoolean(storage_key, next_value);
    },
    [storage_key, default_value]
  );

  const toggleValue = useCallback(() => setValue((previous_value) => !previous_value), [setValue]);

  return [value, setValue, toggleValue] as const;
}
