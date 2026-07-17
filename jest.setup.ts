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
