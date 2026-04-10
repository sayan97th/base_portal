"use client";

import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type {
  ColumnFilter,
} from "@/hooks/useColumnFilters";
import { isFilterActive } from "@/hooks/useColumnFilters";

// ── Props ──────────────────────────────────────────────────────────────────────

interface ColumnFilterDropdownProps {
  col_key: string;
  col_label: string;
  col_type: "text" | "select" | "date" | "url" | "number";
  col_options?: string[];
  current_filter: ColumnFilter | undefined;
  anchor_el: HTMLElement | null;
  onSetFilter: (filter: ColumnFilter | null) => void;
  onClose: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function ColumnFilterDropdown({
  col_label,
  col_type,
  col_options,
  current_filter,
  anchor_el,
  onSetFilter,
  onClose,
}: ColumnFilterDropdownProps) {
  const dropdown_ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  // ── Positioning ──────────────────────────────────────────────────────────────

  useLayoutEffect(() => {
    if (!anchor_el) return;

    const reposition = () => {
      const rect = anchor_el.getBoundingClientRect();
      const dropdown_w = dropdown_ref.current?.offsetWidth ?? 256;
      const left = Math.min(rect.left, window.innerWidth - dropdown_w - 8);
      setPosition({
        top: rect.bottom + 4,
        left: Math.max(8, left),
      });
    };

    reposition();
  }, [anchor_el]);

  // ── Close on outside click ───────────────────────────────────────────────────

  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (
        dropdown_ref.current &&
        !dropdown_ref.current.contains(e.target as Node) &&
        anchor_el &&
        !anchor_el.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [anchor_el, onClose]);

  // ── Close on Escape ──────────────────────────────────────────────────────────

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // ── Local state for the filter being built ───────────────────────────────────

  const [local_text, setLocalText] = useState(
    current_filter?.type === "text" ? current_filter.value : ""
  );
  const [local_selected, setLocalSelected] = useState<string[]>(
    current_filter?.type === "select" ? current_filter.values : []
  );
  const [local_min, setLocalMin] = useState(
    current_filter?.type === "number" ? current_filter.min : ""
  );
  const [local_max, setLocalMax] = useState(
    current_filter?.type === "number" ? current_filter.max : ""
  );
  const [local_from, setLocalFrom] = useState(
    current_filter?.type === "date" ? current_filter.from : ""
  );
  const [local_to, setLocalTo] = useState(
    current_filter?.type === "date" ? current_filter.to : ""
  );

  // ── Derived ──────────────────────────────────────────────────────────────────

  const is_select = col_type === "select" && col_options && col_options.length > 0;
  const is_number = col_type === "number";
  const is_date = col_type === "date";
  const is_text = col_type === "text" || col_type === "url";

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const toggleSelectValue = (val: string) =>
    setLocalSelected((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );

  const handleApply = () => {
    if (is_select) {
      onSetFilter(
        local_selected.length > 0
          ? { type: "select", values: local_selected }
          : null
      );
    } else if (is_number) {
      onSetFilter({ type: "number", min: local_min, max: local_max });
    } else if (is_date) {
      onSetFilter({ type: "date", from: local_from, to: local_to });
    } else {
      onSetFilter({ type: "text", value: local_text });
    }
    onClose();
  };

  const handleClear = () => {
    onSetFilter(null);
    onClose();
  };

  const has_active = current_filter ? isFilterActive(current_filter) : false;

  // ── Render ───────────────────────────────────────────────────────────────────

  if (typeof document === "undefined") return null;

  const content = (
    <div
      ref={dropdown_ref}
      className="fixed z-[9999] w-64 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
      style={{ top: position.top, left: position.left }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-800/60">
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">
          Filter: {col_label}
        </p>
        {has_active && (
          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            Active
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-3">
        {/* Select: checkbox list */}
        {is_select && (
          <div className="max-h-52 space-y-0.5 overflow-y-auto">
            <button
              onClick={() =>
                setLocalSelected(
                  local_selected.length === col_options!.length
                    ? []
                    : [...col_options!]
                )
              }
              className="mb-1.5 w-full rounded border border-dashed border-gray-300 py-0.5 text-xs text-gray-500 hover:border-gray-400 hover:text-gray-700 dark:border-gray-600 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:text-gray-300"
            >
              {local_selected.length === col_options!.length
                ? "Deselect all"
                : "Select all"}
            </button>
            {col_options!.map((opt) => (
              <label
                key={opt}
                className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-xs hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <input
                  type="checkbox"
                  checked={local_selected.includes(opt)}
                  onChange={() => toggleSelectValue(opt)}
                  className="h-3 w-3 rounded accent-brand-500"
                />
                <span className="text-gray-700 dark:text-gray-300">{opt}</span>
              </label>
            ))}
          </div>
        )}

        {/* Number: min / max range */}
        {is_number && (
          <div className="space-y-2">
            <div>
              <label className="mb-0.5 block text-xs text-gray-500 dark:text-gray-400">
                Min value
              </label>
              <input
                type="number"
                value={local_min}
                onChange={(e) => setLocalMin(e.target.value)}
                placeholder="No minimum"
                className="h-7 w-full rounded border border-gray-200 bg-gray-50 px-2 text-xs outline-none transition focus:border-brand-400 focus:ring-1 focus:ring-brand-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              />
            </div>
            <div>
              <label className="mb-0.5 block text-xs text-gray-500 dark:text-gray-400">
                Max value
              </label>
              <input
                type="number"
                value={local_max}
                onChange={(e) => setLocalMax(e.target.value)}
                placeholder="No maximum"
                className="h-7 w-full rounded border border-gray-200 bg-gray-50 px-2 text-xs outline-none transition focus:border-brand-400 focus:ring-1 focus:ring-brand-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              />
            </div>
          </div>
        )}

        {/* Date: from / to range */}
        {is_date && (
          <div className="space-y-2">
            <div>
              <label className="mb-0.5 block text-xs text-gray-500 dark:text-gray-400">
                From (MM/DD/YYYY)
              </label>
              <input
                type="text"
                value={local_from}
                onChange={(e) => setLocalFrom(e.target.value)}
                placeholder="MM/DD/YYYY"
                className="h-7 w-full rounded border border-gray-200 bg-gray-50 px-2 text-xs outline-none transition focus:border-brand-400 focus:ring-1 focus:ring-brand-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              />
            </div>
            <div>
              <label className="mb-0.5 block text-xs text-gray-500 dark:text-gray-400">
                To (MM/DD/YYYY)
              </label>
              <input
                type="text"
                value={local_to}
                onChange={(e) => setLocalTo(e.target.value)}
                placeholder="MM/DD/YYYY"
                className="h-7 w-full rounded border border-gray-200 bg-gray-50 px-2 text-xs outline-none transition focus:border-brand-400 focus:ring-1 focus:ring-brand-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              />
            </div>
          </div>
        )}

        {/* Text / URL: substring search */}
        {is_text && (
          <input
            type="text"
            value={local_text}
            onChange={(e) => setLocalText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleApply()}
            placeholder={`Filter ${col_label}…`}
            autoFocus
            className="h-7 w-full rounded border border-gray-200 bg-gray-50 px-2 text-xs outline-none transition focus:border-brand-400 focus:ring-1 focus:ring-brand-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          />
        )}
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2 dark:border-gray-800">
        <button
          onClick={handleClear}
          className="text-xs text-gray-400 transition-colors hover:text-gray-700 dark:hover:text-gray-200"
        >
          Clear filter
        </button>
        <button
          onClick={handleApply}
          className="rounded bg-brand-500 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-brand-600"
        >
          Apply
        </button>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
