/**
 * Unit tests for useKeepInViewport, which keeps the Filter and Saved Filters
 * panels of the Link Building Orders table fully on screen, so their footer and
 * buttons stay reachable when the page is not scrolled down far enough.
 */

import { renderHook } from "@testing-library/react";
import { useKeepInViewport } from "@/hooks/useKeepInViewport";

const VIEWPORT_HEIGHT = 800;
const HEADER_HEIGHT = 72;

let resize_callbacks: ResizeObserverCallback[] = [];

class MockResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    resize_callbacks.push(callback);
  }
  observe() {}
  disconnect() {}
  unobserve() {}
}

function mockRect(element: HTMLElement, top: number, height: number): void {
  element.getBoundingClientRect = () =>
    ({ top, bottom: top + height, left: 100, right: 500, width: 400, height, x: 100, y: top }) as DOMRect;
  Object.defineProperty(element, "offsetHeight", { configurable: true, value: height });
}

function addStickyHeader(): void {
  const header = document.createElement("header");
  header.style.position = "sticky";
  header.style.top = "0px";
  mockRect(header, 0, HEADER_HEIGHT);
  document.body.appendChild(header);
}

function createPanel(top: number, height: number) {
  const panel = document.createElement("div");
  mockRect(panel, top, height);
  const scroll_into_view = jest.fn();
  panel.scrollIntoView = scroll_into_view;
  document.body.appendChild(panel);
  return { panel, scroll_into_view, ref: { current: panel } };
}

function triggerResizeObservers(): void {
  resize_callbacks.forEach((callback) => callback([], {} as ResizeObserver));
}

beforeEach(() => {
  resize_callbacks = [];
  Object.defineProperty(window, "innerHeight", { configurable: true, value: VIEWPORT_HEIGHT });
  Object.defineProperty(document.documentElement, "clientWidth", { configurable: true, value: 1280 });
  (window as unknown as { ResizeObserver: unknown }).ResizeObserver = MockResizeObserver;
  window.matchMedia = jest.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("useKeepInViewport", () => {
  it("does not scroll when the panel already fits on screen", () => {
    const { ref, scroll_into_view } = createPanel(200, 300);

    renderHook(() => useKeepInViewport(ref, true));

    expect(scroll_into_view).not.toHaveBeenCalled();
  });

  it("scrolls the page when the panel opens partly below the fold", () => {
    const { ref, scroll_into_view } = createPanel(600, 400);

    renderHook(() => useKeepInViewport(ref, true));

    expect(scroll_into_view).toHaveBeenCalledWith({ block: "nearest", behavior: "smooth" });
  });

  it("scrolls again when the panel grows after opening", () => {
    const { panel, ref, scroll_into_view } = createPanel(500, 120);

    renderHook(() => useKeepInViewport(ref, true));
    expect(scroll_into_view).not.toHaveBeenCalled();

    // Values finished loading, or the admin added a filter.
    mockRect(panel, 500, 450);
    triggerResizeObservers();

    expect(scroll_into_view).toHaveBeenCalledTimes(1);
  });

  it("does not scroll when the panel shrinks", () => {
    const { panel, ref, scroll_into_view } = createPanel(600, 400);

    renderHook(() => useKeepInViewport(ref, true));
    scroll_into_view.mockClear();

    mockRect(panel, 600, 300);
    triggerResizeObservers();

    expect(scroll_into_view).not.toHaveBeenCalled();
  });

  it("caps the panel height to the room left under the sticky header", () => {
    addStickyHeader();
    const { panel, ref } = createPanel(100, 300);

    renderHook(() => useKeepInViewport(ref, true));

    // 800 viewport, minus the 72px header and a 16px margin above and below it.
    expect(panel.style.maxHeight).toBe(`${VIEWPORT_HEIGHT - HEADER_HEIGHT - 32}px`);
    expect(panel.style.scrollMarginTop).toBe(`${HEADER_HEIGHT + 16}px`);
  });

  it("scrolls when the panel top is hidden under the sticky header", () => {
    addStickyHeader();
    const { ref, scroll_into_view } = createPanel(40, 300);

    renderHook(() => useKeepInViewport(ref, true));

    expect(scroll_into_view).toHaveBeenCalled();
  });

  it("does nothing while the panel is closed", () => {
    const { ref, scroll_into_view } = createPanel(600, 400);

    renderHook(() => useKeepInViewport(ref, false));

    expect(scroll_into_view).not.toHaveBeenCalled();
    expect(resize_callbacks).toHaveLength(0);
  });
});
