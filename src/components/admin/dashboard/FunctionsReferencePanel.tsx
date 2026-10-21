"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  FUNCTION_CATEGORIES,
  formatFunctionSignature,
  getFunctionCatalog,
  type FunctionCategory,
} from "@/lib/spreadsheet-formulas";
import styles from "./SpreadsheetFormulas.module.scss";

interface FunctionsReferencePanelProps {
  anchor_el: HTMLElement | null;
  /** False while a formula is being typed, so the editor keeps focus and the pick lands at its caret. */
  autofocus_search?: boolean;
  onInsert: (function_name: string) => void;
  onClose: () => void;
}

/** Most of the catalog is undocumented library functions, so lists start with the documented ones. */
const MAX_RESULTS = 120;

/**
 * Searchable list of every function the spreadsheet supports, grouped by
 * category, with its syntax, a summary and an example. Picking one inserts it
 * into the formula being edited (or starts a new formula in the active cell).
 */
export default function FunctionsReferencePanel({
  anchor_el,
  autofocus_search = true,
  onInsert,
  onClose,
}: FunctionsReferencePanelProps) {
  const panel_ref = useRef<HTMLDivElement>(null);
  const search_ref = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FunctionCategory | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return getFunctionCatalog()
      .filter((info) => !category || info.category === category)
      .filter(
        (info) => needle === "" || info.name.toLowerCase().includes(needle) || info.description.toLowerCase().includes(needle)
      )
      .sort((a, b) => {
        // Documented functions (with real argument names) first, exact name matches on top.
        const documented = Number(a.args[0] === "...") - Number(b.args[0] === "...");
        if (documented !== 0) return documented;
        if (needle) {
          const starts = Number(!a.name.toLowerCase().startsWith(needle)) - Number(!b.name.toLowerCase().startsWith(needle));
          if (starts !== 0) return starts;
        }
        return a.name.localeCompare(b.name);
      });
  }, [query, category]);

  /** Places the panel under its anchor, flipped or shifted to stay on screen, once it is measured. */
  const measurePanel = useCallback(
    (panel: HTMLDivElement | null) => {
      panel_ref.current = panel;
      if (!panel || !anchor_el) return;
      const anchor_rect = anchor_el.getBoundingClientRect();
      const panel_rect = panel.getBoundingClientRect();
      let top = anchor_rect.bottom + 6;
      if (top + panel_rect.height > window.innerHeight - 8) top = Math.max(8, window.innerHeight - panel_rect.height - 8);
      let left = anchor_rect.left;
      if (left + panel_rect.width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - panel_rect.width - 8);
      setPosition({ top, left });
    },
    [anchor_el]
  );

  // Only on open: focusing the search later would pull focus out of a formula being typed.
  const autofocus_ref = useRef(autofocus_search);
  useEffect(() => {
    if (autofocus_ref.current) search_ref.current?.focus();
  }, []);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panel_ref.current?.contains(target) || anchor_el?.contains(target)) return;
      onClose();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [anchor_el, onClose]);

  if (typeof document === "undefined" || !anchor_el) return null;

  const shown = results.slice(0, MAX_RESULTS);

  return createPortal(
    <div
      ref={measurePanel}
      className={styles.functions_panel}
      style={position ? { top: position.top, left: position.left } : { top: -9999, left: -9999 }}
      role="dialog"
      aria-label="Functions"
    >
      <div className={styles.functions_header}>
        <h3>Functions</h3>
        <p>
          {getFunctionCatalog().length} Google Sheets and Excel functions. Type <code>=</code> in a cell to start a
          formula, then pick one to insert it.
        </p>
        <input
          ref={search_ref}
          className={styles.functions_search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search, e.g. VLOOKUP, date, count..."
          aria-label="Search functions"
        />
        <div className={styles.functions_categories}>
          <button
            type="button"
            className={`${styles.category_chip}${category === null ? ` ${styles.category_chip_active}` : ""}`}
            onClick={() => setCategory(null)}
          >
            All
          </button>
          {FUNCTION_CATEGORIES.map((name) => (
            <button
              key={name}
              type="button"
              className={`${styles.category_chip}${category === name ? ` ${styles.category_chip_active}` : ""}`}
              onClick={() => setCategory((current) => (current === name ? null : name))}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.functions_list}>
        {shown.length === 0 ? (
          <p className={styles.functions_empty}>No function matches &ldquo;{query}&rdquo;.</p>
        ) : (
          shown.map((info) => (
            <button
              key={info.name}
              type="button"
              className={styles.function_row}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onInsert(info.name)}
            >
              <span className={styles.function_row_head}>
                <code className={styles.assist_signature}>{formatFunctionSignature(info)}</code>
                <span className={styles.function_row_insert}>Insert</span>
              </span>
              <p className={styles.function_row_description}>{info.description}</p>
              {info.example && (
                <p className={styles.assist_example}>
                  <code>={info.example}</code>
                </p>
              )}
            </button>
          ))
        )}
      </div>
      <p className={styles.functions_footer}>
        Formulas read the rows loaded on this page. Columns keep their letter when others are hidden, and a formula
        keeps working when columns or rows move.
      </p>
    </div>,
    document.body
  );
}
