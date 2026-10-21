/**
 * Unit tests for the platform aware keyboard shortcut labels shown in the admin
 * Link Building Orders table (⌘C on Mac, Ctrl+C on Windows and Linux).
 */

import { formatShortcut, isMacPlatform } from "@/lib/keyboard-shortcuts";

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
