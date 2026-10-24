import { act, renderHook } from "@testing-library/react";
import { useVirtualRows } from "@/hooks/useVirtualRows";

const ROW_HEIGHT = 34;

/** A scroll container with a fixed viewport, jsdom does not lay elements out. */
function makeScrollElement(client_height: number): HTMLDivElement {
  const element = document.createElement("div");
  Object.defineProperty(element, "clientHeight", { configurable: true, value: client_height });
  element.scrollTo = ((options: ScrollToOptions) => {
    element.scrollTop = options.top ?? 0;
    element.dispatchEvent(new Event("scroll"));
  }) as typeof element.scrollTo;
  return element;
}

function scrollTo(element: HTMLElement, scroll_top: number) {
  act(() => {
    element.scrollTop = scroll_top;
    element.dispatchEvent(new Event("scroll"));
  });
}

describe("useVirtualRows", () => {
  it("renders only the rows around the viewport, with spacers for the rest", () => {
    const element = makeScrollElement(340);
    const { result } = renderHook(() =>
      useVirtualRows({ scroll_element: element, row_count: 30_000, row_height: ROW_HEIGHT, overscan: 15, step: 10 })
    );

    expect(result.current.start_index).toBe(0);
    expect(result.current.end_index).toBe(30);
    expect(result.current.padding_top).toBe(0);
    expect(result.current.padding_bottom).toBe((30_000 - 30) * ROW_HEIGHT);
  });

  it("keeps the spacers and rendered rows adding up to the full height", () => {
    const element = makeScrollElement(340);
    const { result } = renderHook(() =>
      useVirtualRows({ scroll_element: element, row_count: 30_000, row_height: ROW_HEIGHT })
    );

    scrollTo(element, 5_000 * ROW_HEIGHT);

    const { start_index, end_index, padding_top, padding_bottom } = result.current;
    expect(start_index).toBeLessThanOrEqual(5_000);
    expect(end_index).toBeGreaterThanOrEqual(5_010);
    expect(padding_top + (end_index - start_index) * ROW_HEIGHT + padding_bottom).toBe(30_000 * ROW_HEIGHT);
  });

  it("moves the window in blocks, so a small scroll does not change it", () => {
    const element = makeScrollElement(340);
    const { result } = renderHook(() =>
      useVirtualRows({ scroll_element: element, row_count: 1_000, row_height: ROW_HEIGHT, overscan: 15, step: 10 })
    );

    scrollTo(element, 100 * ROW_HEIGHT);
    const window_before = [result.current.start_index, result.current.end_index];
    scrollTo(element, 100 * ROW_HEIGHT + 20);

    expect([result.current.start_index, result.current.end_index]).toEqual(window_before);
  });

  it("never renders past the last row", () => {
    const element = makeScrollElement(340);
    const { result } = renderHook(() =>
      useVirtualRows({ scroll_element: element, row_count: 25, row_height: ROW_HEIGHT })
    );

    expect(result.current.end_index).toBe(25);
    expect(result.current.padding_bottom).toBe(0);
  });

  it("follows the row count as more rows arrive", () => {
    const element = makeScrollElement(340);
    const { result, rerender } = renderHook(
      ({ row_count }) => useVirtualRows({ scroll_element: element, row_count, row_height: ROW_HEIGHT }),
      { initialProps: { row_count: 5 } }
    );
    expect(result.current.end_index).toBe(5);

    rerender({ row_count: 5_000 });

    expect(result.current.end_index).toBeGreaterThan(5);
    expect(result.current.padding_bottom).toBe((5_000 - result.current.end_index) * ROW_HEIGHT);
  });

  it("renders a first screen of rows before the scroll container has a size", () => {
    const { result } = renderHook(() =>
      useVirtualRows({ scroll_element: null, row_count: 10_000, row_height: ROW_HEIGHT, fallback_viewport_height: 680 })
    );

    expect(result.current.start_index).toBe(0);
    expect(result.current.end_index).toBeGreaterThanOrEqual(20);
    expect(result.current.end_index).toBeLessThan(100);
  });

  it("scrolls a far away row into view and renders it", () => {
    const element = makeScrollElement(340);
    const { result } = renderHook(() =>
      useVirtualRows({ scroll_element: element, row_count: 30_000, row_height: ROW_HEIGHT })
    );

    act(() => result.current.scrollRowIntoView(20_000));

    expect(result.current.start_index).toBeLessThanOrEqual(20_000);
    expect(result.current.end_index).toBeGreaterThan(20_000);
  });

  it("does not scroll for a row already in view", () => {
    const element = makeScrollElement(340);
    const { result } = renderHook(() =>
      useVirtualRows({ scroll_element: element, row_count: 1_000, row_height: ROW_HEIGHT })
    );

    act(() => result.current.scrollRowIntoView(2));

    expect(element.scrollTop).toBe(0);
  });

  it("stops listening to the scroll container once unmounted", () => {
    const element = makeScrollElement(340);
    const remove_listener = jest.spyOn(element, "removeEventListener");
    const { unmount } = renderHook(() =>
      useVirtualRows({ scroll_element: element, row_count: 1_000, row_height: ROW_HEIGHT })
    );

    unmount();

    expect(remove_listener).toHaveBeenCalledWith("scroll", expect.any(Function));
  });

  it("subscribes to the scroll container once it mounts", () => {
    const element = makeScrollElement(340);
    const { result, rerender } = renderHook(
      ({ scroll_element }) => useVirtualRows({ scroll_element, row_count: 30_000, row_height: ROW_HEIGHT }),
      { initialProps: { scroll_element: null as HTMLElement | null } }
    );

    rerender({ scroll_element: element });
    scrollTo(element, 10_000 * ROW_HEIGHT);

    expect(result.current.start_index).toBeGreaterThan(9_000);
  });

  it("renders more rows when the viewport grows", () => {
    const observers: Array<() => void> = [];
    const original_resize_observer = global.ResizeObserver;
    global.ResizeObserver = class {
      constructor(callback: () => void) {
        observers.push(callback);
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;

    try {
      const element = makeScrollElement(340);
      const { result } = renderHook(() =>
        useVirtualRows({ scroll_element: element, row_count: 30_000, row_height: ROW_HEIGHT })
      );
      const end_before = result.current.end_index;

      act(() => {
        Object.defineProperty(element, "clientHeight", { configurable: true, value: 3_400 });
        observers.forEach((notify) => notify());
      });

      expect(result.current.end_index).toBeGreaterThan(end_before);
    } finally {
      global.ResizeObserver = original_resize_observer;
    }
  });

  it("brings a row above the viewport back into view", () => {
    const element = makeScrollElement(340);
    const { result } = renderHook(() =>
      useVirtualRows({ scroll_element: element, row_count: 30_000, row_height: ROW_HEIGHT })
    );
    scrollTo(element, 20_000 * ROW_HEIGHT);

    act(() => result.current.scrollRowIntoView(100));

    expect(element.scrollTop).toBeLessThanOrEqual(100 * ROW_HEIGHT);
    expect(result.current.start_index).toBeLessThanOrEqual(100);
    expect(result.current.end_index).toBeGreaterThan(100);
  });

  it("returns an empty window for an empty table", () => {
    const element = makeScrollElement(340);
    const { result } = renderHook(() =>
      useVirtualRows({ scroll_element: element, row_count: 0, row_height: ROW_HEIGHT })
    );

    expect(result.current).toMatchObject({ start_index: 0, end_index: 0, padding_top: 0, padding_bottom: 0 });
  });
});

