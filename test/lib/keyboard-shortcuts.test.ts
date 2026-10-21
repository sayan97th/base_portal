/**
 * Unit tests for the platform aware keyboard shortcut labels shown in the admin
 * Link Building Orders table (⌘C on Mac, Ctrl+C on Windows and Linux).
 */

import { formatShortcut, getBrowserPlatform, isMacPlatform } from "@/lib/keyboard-shortcuts";

describe("isMacPlatform", () => {
  it("detects macOS and iOS platforms", () => {
    expect(isMacPlatform("MacIntel")).toBe(true);
    expect(isMacPlatform("macOS")).toBe(true);
    expect(isMacPlatform("iPad")).toBe(true);
  });

  it("rejects other platforms", () => {
    expect(isMacPlatform("Win32")).toBe(false);
    expect(isMacPlatform("Linux x86_64")).toBe(false);
    expect(isMacPlatform("")).toBe(false);
  });
});

describe("formatShortcut", () => {
  it("uses Mac symbols without separators on Mac", () => {
    expect(formatShortcut(["Mod", "C"], true)).toBe("⌘C");
    expect(formatShortcut(["Mod", "Shift", "Z"], true)).toBe("⌘⇧Z");
    expect(formatShortcut(["Ctrl", "Space"], true)).toBe("⌃Space");
    expect(formatShortcut(["Mod", ";"], true)).toBe("⌘;");
  });

  it("uses Ctrl and plus signs elsewhere", () => {
    expect(formatShortcut(["Mod", "C"], false)).toBe("Ctrl+C");
    expect(formatShortcut(["Mod", "Shift", "Z"], false)).toBe("Ctrl+Shift+Z");
    expect(formatShortcut(["Escape"], false)).toBe("Esc");
  });
});

describe("getBrowserPlatform", () => {
  function mockNavigator(platform: string, ua_platform?: string): void {
    Object.defineProperty(window.navigator, "platform", { configurable: true, get: () => platform });
    Object.defineProperty(window.navigator, "userAgentData", {
      configurable: true,
      get: () => (ua_platform === undefined ? undefined : { platform: ua_platform }),
    });
  }

  afterEach(() => mockNavigator(""));

  it("prefers the newer userAgentData platform", () => {
    mockNavigator("Win32", "macOS");
    expect(getBrowserPlatform()).toBe("macOS");
  });

  it("falls back to navigator.platform", () => {
    mockNavigator("MacIntel");
    expect(getBrowserPlatform()).toBe("MacIntel");
  });

  it("falls back to the user agent when the platform is empty", () => {
    mockNavigator("", "");
    expect(getBrowserPlatform()).toBe(navigator.userAgent);
  });
});

describe("formatShortcut, named keys", () => {
  it("uses the Mac symbols for Enter, Backspace, Delete and Option", () => {
    expect(formatShortcut(["Shift", "Enter"], true)).toBe("⇧↩");
    expect(formatShortcut(["Backspace"], true)).toBe("⌫");
    expect(formatShortcut(["Delete"], true)).toBe("⌦");
    expect(formatShortcut(["Alt", "A"], true)).toBe("⌥A");
  });

  it("keeps plain key names on PC", () => {
    expect(formatShortcut(["Shift", "Enter"], false)).toBe("Shift+Enter");
    expect(formatShortcut(["Alt", "A"], false)).toBe("Alt+A");
  });
});
