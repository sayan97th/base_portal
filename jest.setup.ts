import "@testing-library/jest-dom";

// jsdom does not implement Blob/File.prototype.arrayBuffer(), which the
// spreadsheet import relies on (src/lib/intake-import.ts). Every modern browser
// implements it natively, so this polyfill only affects the test environment.
if (typeof Blob !== "undefined" && typeof Blob.prototype.arrayBuffer !== "function") {
  Blob.prototype.arrayBuffer = function arrayBuffer(): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(this);
    });
  };
}

// jsdom does not implement window.matchMedia(). useKeepInViewport reads
// "(prefers-reduced-motion: reduce)" when scrolling a cell into view, which the
// admin dashboard tables and filter panels do. Default to "no match", the same
// as a browser with no user preference set. Tests can still override it.
if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// jsdom has no layout engine, so it does not implement Element.scrollIntoView().
// useKeepInViewport and several admin dashboard menus call it after opening.
// A no-op is enough: tests that assert scrolling assign their own jest.fn()
// on the element, which takes precedence over this prototype default.
if (typeof Element !== "undefined" && typeof Element.prototype.scrollIntoView !== "function") {
  Element.prototype.scrollIntoView = function scrollIntoView(): void {};
}

// jsdom does not implement Blob/File.prototype.text() either. Tests read the
// CSV template the metrics dialog downloads (LinkBuildingMetricsUpdateModal).
if (typeof Blob !== "undefined" && typeof Blob.prototype.text !== "function") {
  Blob.prototype.text = function text(): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(this);
    });
  };
}
