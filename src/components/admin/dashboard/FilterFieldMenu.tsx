"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { getAnchoredMenuStyle } from "@/lib/anchored-menu-position";

export interface FilterFieldMenuProps<T> {
  options: T[];
  getOptionId: (option: T) => string;
  isSelected: (option: T) => boolean;
  onSelect: (option: T) => void;
  /** Content of the closed field, e.g. the selected column or a placeholder. */
  renderValue: () => React.ReactNode;
  renderOption: (option: T) => React.ReactNode;
  /** Accessible name of the field, e.g. "Column". */
  label: string;
  /** When given, the menu shows a search box that matches this text. */
  getSearchText?: (option: T) => string;
  search_placeholder?: string;
  /** Small heading above the options, e.g. "Columns". */
  menu_heading?: string;
  /** Tailwind width of the closed field. */
  width_class?: string;
  /** Minimum width of the open menu in pixels, it never gets narrower than the field. */
  menu_min_width?: number;
  disabled?: boolean;
}

const MENU_MAX_HEIGHT = 300;
const MENU_GAP = 4;

/**
 * Compact select used by the Advanced filters rules (column, condition and the
 * And / Or joins). The menu uses fixed positioning, so it floats above the
 * panel's scroll area instead of being clipped by it, flips above the field
 * when there is more room there, and shrinks to the space left on screen. Arrow keys, Enter and Escape work like a
 * native select, and Escape only closes the menu, not the panel around it.
 */
export default function FilterFieldMenu<T>({
  options,
  getOptionId,
  isSelected,
  onSelect,
  renderValue,
  renderOption,
  label,
  getSearchText,
  search_placeholder = "Search",
  menu_heading,
  width_class = "w-40",
  menu_min_width = 0,
  disabled = false,
}: FilterFieldMenuProps<T>) {
  const [is_open, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlighted_index, setHighlightedIndex] = useState(0);
  const [menu_style, setMenuStyle] = useState<React.CSSProperties>({});

  const container_ref = useRef<HTMLDivElement>(null);
  const trigger_ref = useRef<HTMLButtonElement>(null);
  const list_ref = useRef<HTMLUListElement>(null);

  const visible_options = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!getSearchText || query === "") return options;
    return options.filter((option) => getSearchText(option).toLowerCase().includes(query));
  }, [options, search, getSearchText]);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setSearch("");
  }, []);

  const openMenu = useCallback(() => {
    if (disabled) return;
    const selected_index = options.findIndex(isSelected);
    setHighlightedIndex(Math.max(0, selected_index));
    setIsOpen(true);
  }, [disabled, options, isSelected]);

  const updatePosition = useCallback(() => {
    const rect = trigger_ref.current?.getBoundingClientRect();
    if (!rect) return;
    setMenuStyle(
      getAnchoredMenuStyle(rect, {
        width: Math.max(rect.width, menu_min_width),
        preferred_height: MENU_MAX_HEIGHT,
        gap: MENU_GAP,
      })
    );
  }, [menu_min_width]);

  useLayoutEffect(() => {
    if (is_open) updatePosition();
  }, [is_open, updatePosition]);

  useEffect(() => {
    if (!is_open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (container_ref.current && !container_ref.current.contains(e.target as Node)) closeMenu();
    };
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [is_open, closeMenu, updatePosition]);

  // Keeps the highlighted option in view while moving with the arrow keys.
  useEffect(() => {
    if (!is_open) return;
    const item = list_ref.current?.children[highlighted_index] as HTMLElement | undefined;
    item?.scrollIntoView?.({ block: "nearest" });
  }, [is_open, highlighted_index]);

  const selectOption = (option: T) => {
    onSelect(option);
    closeMenu();
    trigger_ref.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!is_open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    if (e.key === "Escape") {
      // Only this menu closes, the panel around it stays open.
      e.preventDefault();
      e.stopPropagation();
      closeMenu();
      trigger_ref.current?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((index) => Math.min(index + 1, visible_options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((index) => Math.max(index - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const option = visible_options[highlighted_index];
      if (option) selectOption(option);
    } else if (e.key === "Tab") {
      closeMenu();
    }
  };

  return (
    <div ref={container_ref} className={`relative ${width_class}`} onKeyDown={handleKeyDown}>
      <button
        ref={trigger_ref}
        type="button"
        disabled={disabled}
        onClick={() => (is_open ? closeMenu() : openMenu())}
        aria-haspopup="listbox"
        aria-expanded={is_open}
        aria-label={label}
        className={`flex h-8 w-full items-center gap-1.5 rounded-lg border bg-white px-2.5 text-left text-xs text-gray-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-900 dark:text-gray-200 ${
          is_open
            ? "border-brand-400 ring-2 ring-brand-500/10"
            : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
        }`}
      >
        <span className="flex min-w-0 flex-1 items-center gap-1.5">{renderValue()}</span>
        <svg
          className={`h-3 w-3 shrink-0 text-gray-400 transition-transform ${is_open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {is_open && (
        <div
          style={menu_style}
          className="z-[60] flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg shadow-gray-200/60 dark:border-gray-700 dark:bg-gray-800 dark:shadow-black/30"
        >
          {getSearchText && (
            <div className="shrink-0 border-b border-gray-100 p-1.5 dark:border-gray-700">
              <input
                type="text"
                autoFocus
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setHighlightedIndex(0);
                }}
                placeholder={search_placeholder}
                aria-label={search_placeholder}
                className="h-7 w-full rounded-md border border-gray-200 bg-gray-50 px-2 text-xs text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              />
            </div>
          )}
          {menu_heading && (
            <p className="shrink-0 px-3 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              {menu_heading}
            </p>
          )}
          <ul ref={list_ref} role="listbox" aria-label={label} className="min-h-0 flex-1 overflow-y-auto py-1">
            {visible_options.length === 0 ? (
              <li className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500">No matches</li>
            ) : (
              visible_options.map((option, index) => {
                const is_selected = isSelected(option);
                return (
                  <li
                    key={getOptionId(option)}
                    role="option"
                    aria-selected={is_selected}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectOption(option)}
                    className={`mx-1 flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs ${
                      index === highlighted_index ? "bg-gray-100 dark:bg-gray-700" : ""
                    } ${is_selected ? "font-medium text-brand-700 dark:text-brand-300" : "text-gray-700 dark:text-gray-200"}`}
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-2">{renderOption(option)}</span>
                    {is_selected && (
                      <svg className="h-3.5 w-3.5 shrink-0 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
