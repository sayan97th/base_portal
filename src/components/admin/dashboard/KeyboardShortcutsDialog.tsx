import React, { useEffect, useRef } from "react";
import { formatShortcut, type ShortcutKey } from "@/lib/keyboard-shortcuts";

interface ShortcutEntry {
  description: string;
  /** Alternative key combinations, shown separated by "or". */
  keys: ReadonlyArray<ReadonlyArray<ShortcutKey>>;
  /** Mac specific combinations when they differ (e.g. Fn+← for Home on a MacBook keyboard). */
  mac_keys?: ReadonlyArray<ReadonlyArray<ShortcutKey>>;
}

interface ShortcutGroup {
  title: string;
  entries: ReadonlyArray<ShortcutEntry>;
}

/** Every shortcut the Link Building Orders grid supports, mirroring Google Sheets. */
export const LINK_BUILDING_ORDER_SHORTCUT_GROUPS: ReadonlyArray<ShortcutGroup> = [
  {
    title: "Move around",
    entries: [
      { description: "Move one cell", keys: [["Arrow keys"]] },
      { description: "Jump to the edge of the table", keys: [["Mod", "Arrow"]] },
      { description: "Next or previous cell", keys: [["Tab"], ["Shift", "Tab"]] },
      { description: "Start or end of the row", keys: [["Home"], ["End"]], mac_keys: [["Fn", "←"], ["Fn", "→"]] },
      { description: "First or last cell of the table", keys: [["Mod", "Home"], ["Mod", "End"]], mac_keys: [["Mod", "Fn", "←"], ["Mod", "Fn", "→"]] },
      { description: "Page up or down", keys: [["PageUp"], ["PageDown"]], mac_keys: [["Fn", "↑"], ["Fn", "↓"]] },
    ],
  },
  {
    title: "Select",
    entries: [
      { description: "Extend the selection", keys: [["Shift", "Arrow"]] },
      { description: "Extend the selection to the edge", keys: [["Mod", "Shift", "Arrow"]] },
      { description: "Select every cell on the page", keys: [["Mod", "A"]] },
      { description: "Select the row", keys: [["Shift", "Space"]] },
      { description: "Select the column", keys: [["Ctrl", "Space"]] },
      { description: "Clear the selection", keys: [["Escape"]] },
    ],
  },
  {
    title: "Edit",
    entries: [
      { description: "Edit the cell", keys: [["Enter"], ["F2"]] },
      { description: "Replace the cell's content", keys: [["Start typing"]] },
      { description: "Save and move down or up", keys: [["Enter"], ["Shift", "Enter"]] },
      { description: "Cancel the edit", keys: [["Escape"]] },
      { description: "Clear the selected cells", keys: [["Delete"], ["Backspace"]] },
      { description: "Insert today's date", keys: [["Mod", ";"]] },
      { description: "Move a date one day later or earlier (while editing a date)", keys: [["↑"], ["↓"]] },
      { description: "Start a formula", keys: [["="]] },
    ],
  },
  {
    title: "Clipboard and history",
    entries: [
      { description: "Copy", keys: [["Mod", "C"]] },
      { description: "Cut", keys: [["Mod", "X"]] },
      { description: "Paste", keys: [["Mod", "V"]] },
      { description: "Fill down", keys: [["Mod", "D"]] },
      { description: "Fill right", keys: [["Mod", "R"]] },
      { description: "Undo", keys: [["Mod", "Z"]] },
      { description: "Redo", keys: [["Mod", "Shift", "Z"], ["Mod", "Y"]] },
    ],
  },
  {
    title: "Find and help",
    entries: [
      { description: "Find in the table", keys: [["Mod", "F"]] },
      { description: "Next or previous match", keys: [["Enter"], ["Shift", "Enter"]] },
      { description: "Show keyboard shortcuts", keys: [["Mod", "/"]] },
    ],
  },
];

interface KeyboardShortcutsDialogProps {
  is_open: boolean;
  is_mac: boolean;
  onClose: () => void;
}

/** Cheat sheet of the grid's keyboard shortcuts, labeled for the viewer's platform. */
export default function KeyboardShortcutsDialog({ is_open, is_mac, onClose }: KeyboardShortcutsDialogProps) {
  const close_button_ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!is_open) return;
    close_button_ref.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [is_open, onClose]);

  if (!is_open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="keyboard-shortcuts-title"
        className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-3 dark:border-gray-700 dark:bg-gray-900">
          <h2 id="keyboard-shortcuts-title" className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Keyboard shortcuts
          </h2>
          <button
            ref={close_button_ref}
            onClick={onClose}
            aria-label="Close keyboard shortcuts"
            className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="grid gap-x-8 gap-y-5 px-5 py-4 md:grid-cols-2">
          {LINK_BUILDING_ORDER_SHORTCUT_GROUPS.map((group) => (
            <section key={group.title}>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {group.title}
              </h3>
              <ul className="space-y-1.5">
                {group.entries.map((entry) => {
                  const combos = (is_mac && entry.mac_keys) || entry.keys;
                  return (
                    <li key={entry.description} className="flex items-center justify-between gap-3 text-xs">
                      <span className="text-gray-700 dark:text-gray-300">{entry.description}</span>
                      <span className="flex shrink-0 items-center gap-1">
                        {combos.map((combo, idx) => (
                          <React.Fragment key={combo.join("+")}>
                            {idx > 0 && <span className="text-[10px] text-gray-400">or</span>}
                            <kbd className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-mono text-[10px] text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                              {formatShortcut(combo, is_mac)}
                            </kbd>
                          </React.Fragment>
                        ))}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
