/**
 * Unit tests for useIsMacPlatform, which picks the keyboard shortcut labels of the
 * admin tables (⌘ on Mac, Ctrl elsewhere) without a server and client markup mismatch.
 */

import { renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import React from "react";
import { useIsMacPlatform } from "@/hooks/useIsMacPlatform";

function mockNavigator(platform: string, ua_platform?: string): void {
  Object.defineProperty(window.navigator, "platform", { configurable: true, get: () => platform });
  Object.defineProperty(window.navigator, "userAgentData", {
    configurable: true,
    get: () => (ua_platform === undefined ? undefined : { platform: ua_platform }),
  });
}

afterEach(() => {
  mockNavigator("");
});

describe("useIsMacPlatform", () => {
  it("is true on a Mac", () => {
    mockNavigator("MacIntel");

    expect(renderHook(() => useIsMacPlatform()).result.current).toBe(true);
  });

  it("is false on Windows and Linux", () => {
    mockNavigator("Win32");
    expect(renderHook(() => useIsMacPlatform()).result.current).toBe(false);

    mockNavigator("Linux x86_64");
    expect(renderHook(() => useIsMacPlatform()).result.current).toBe(false);
  });

  it("prefers userAgentData when the browser provides it", () => {
    mockNavigator("Win32", "macOS");

    expect(renderHook(() => useIsMacPlatform()).result.current).toBe(true);
  });

  it("renders PC labels on the server, so hydration never mismatches", () => {
    mockNavigator("MacIntel");
    function Label() {
      return React.createElement("span", null, useIsMacPlatform() ? "mac" : "pc");
    }

    expect(renderToString(React.createElement(Label))).toContain("pc");
  });
});
