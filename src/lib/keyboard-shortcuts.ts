/**
 * Platform aware keyboard shortcut labels. Mac users read "⌘C" where Windows and
 * Linux users read "Ctrl+C", the way Google Sheets labels its shortcuts.
 */

/** A shortcut key. "Mod" is Cmd on Mac and Ctrl everywhere else. */
export type ShortcutKey = "Mod" | "Ctrl" | "Shift" | "Alt" | (string & {});

const MAC_KEY_SYMBOLS: Record<string, string> = {
  Mod: "⌘",
  Ctrl: "⌃",
  Shift: "⇧",
  Alt: "⌥",
  Enter: "↩",
  Backspace: "⌫",
  Delete: "⌦",
  Escape: "Esc",
};

const PC_KEY_LABELS: Record<string, string> = {
  Mod: "Ctrl",
  Escape: "Esc",
};

/** True on macOS (and iPadOS with a keyboard). */
export function isMacPlatform(platform: string): boolean {
  return /mac|iphone|ipad|ipod/i.test(platform);
}

/** Reads the browser's platform, preferring the newer userAgentData when available. */
export function getBrowserPlatform(): string {
  if (typeof navigator === "undefined") return "";
  const ua_data = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData;
  return ua_data?.platform || navigator.platform || navigator.userAgent || "";
}

/** Label for a shortcut: ["Mod", "Shift", "Z"] is "⌘⇧Z" on Mac and "Ctrl+Shift+Z" elsewhere. */
export function formatShortcut(keys: ReadonlyArray<ShortcutKey>, is_mac: boolean): string {
  if (is_mac) return keys.map((key) => MAC_KEY_SYMBOLS[key] ?? key).join("");
  return keys.map((key) => PC_KEY_LABELS[key] ?? key).join("+");
}
