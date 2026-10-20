/**
 * Tests for the localStorage backed boolean used by the collapsible admin
 * sidebar and the dashboard overview: defaults, toggling, persistence across
 * remounts, sync between components and the in memory fallback.
 */

import { act, renderHook } from "@testing-library/react";
import { usePersistentBoolean } from "@/hooks/usePersistentBoolean";

let key_counter = 0;

/** Each test gets its own key, the hook keeps a module level memory cache. */
function nextStorageKey(): string {
  key_counter += 1;
  return `test_persistent_boolean_${key_counter}`;
}

beforeEach(() => {
  localStorage.clear();
});

describe("usePersistentBoolean", () => {
  it("returns the default value when nothing is saved", () => {
    const storage_key = nextStorageKey();
    const { result } = renderHook(() => usePersistentBoolean(storage_key, true));

    expect(result.current[0]).toBe(true);
  });

  it("reads a value saved earlier", () => {
    const storage_key = nextStorageKey();
    localStorage.setItem(storage_key, "false");
    const { result } = renderHook(() => usePersistentBoolean(storage_key, true));

    expect(result.current[0]).toBe(false);
  });

  it("ignores malformed saved values", () => {
    const storage_key = nextStorageKey();
    localStorage.setItem(storage_key, "maybe");
    const { result } = renderHook(() => usePersistentBoolean(storage_key, true));

    expect(result.current[0]).toBe(true);
  });

  it("toggles and persists the value", () => {
    const storage_key = nextStorageKey();
    const { result, unmount } = renderHook(() => usePersistentBoolean(storage_key, true));

    act(() => result.current[2]());

    expect(result.current[0]).toBe(false);
    expect(localStorage.getItem(storage_key)).toBe("false");

    unmount();
    const { result: remounted } = renderHook(() => usePersistentBoolean(storage_key, true));
    expect(remounted.current[0]).toBe(false);
  });

  it("supports explicit and functional updates", () => {
    const storage_key = nextStorageKey();
    const { result } = renderHook(() => usePersistentBoolean(storage_key, false));

    act(() => result.current[1](true));
    expect(result.current[0]).toBe(true);

    act(() => result.current[1]((previous_value) => !previous_value));
    expect(result.current[0]).toBe(false);
  });

  it("keeps every component using the same key in sync", () => {
    const storage_key = nextStorageKey();
    const { result: first } = renderHook(() => usePersistentBoolean(storage_key, true));
    const { result: second } = renderHook(() => usePersistentBoolean(storage_key, true));

    act(() => first.current[2]());

    expect(second.current[0]).toBe(false);
  });

  it("still toggles when localStorage throws", () => {
    const storage_key = nextStorageKey();
    const set_item_spy = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    const { result } = renderHook(() => usePersistentBoolean(storage_key, true));

    act(() => result.current[2]());

    expect(result.current[0]).toBe(false);
    set_item_spy.mockRestore();
  });
});
