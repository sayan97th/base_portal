"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  formatFunctionSignature,
  type FunctionCallContext,
  type FunctionInfo,
} from "@/lib/spreadsheet-formulas";
import styles from "./SpreadsheetFormulas.module.scss";

interface FormulaAssistPopoverProps {
  anchor_el: HTMLElement | null;
  /** Function names matching what is being typed. */
  suggestions: FunctionInfo[];
  highlighted_idx: number;
  onHighlightChange: (idx: number) => void;
  onPick: (info: FunctionInfo) => void;
  /** The function the caret is inside of, shown as an argument hint when nothing is suggested. */
  call: FunctionCallContext | null;
  call_info: FunctionInfo | null;
}

/** Index of the signature argument to highlight; repeating "..." arguments keep the last one highlighted. */
function getHighlightedArgIdx(info: FunctionInfo, arg_index: number): number {
  return Math.min(arg_index, info.args.length - 1);
}

/**
 * Floating helper under a formula editor, like the one in Google Sheets: the
 * functions matching the name being typed, or, inside a function call, its
 * syntax with the current argument in bold, a summary and an example.
 */
export default function FormulaAssistPopover({
  anchor_el,
  suggestions,
  highlighted_idx,
  onHighlightChange,
  onPick,
  call,
  call_info,
}: FormulaAssistPopoverProps) {
  const panel_ref = useRef<HTMLDivElement>(null);
  const item_refs = useRef<Array<HTMLButtonElement | null>>([]);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  const has_suggestions = suggestions.length > 0;
  const show_hint = !has_suggestions && !!call && !!call_info;
  const is_open = has_suggestions || show_hint;

  useLayoutEffect(() => {
    if (!is_open || !anchor_el || !panel_ref.current) return;
    const anchor_rect = anchor_el.getBoundingClientRect();
    const panel_rect = panel_ref.current.getBoundingClientRect();
    let top = anchor_rect.bottom + 4;
    if (top + panel_rect.height > window.innerHeight - 8) top = Math.max(8, anchor_rect.top - panel_rect.height - 4);
    let left = anchor_rect.left;
    if (left + panel_rect.width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - panel_rect.width - 8);
    setPosition((prev) => (prev && prev.top === top && prev.left === left ? prev : { top, left }));
  }, [is_open, anchor_el, suggestions, call_info, call?.arg_index]);

  useEffect(() => {
    if (highlighted_idx >= 0) item_refs.current[highlighted_idx]?.scrollIntoView?.({ block: "nearest" });
  }, [highlighted_idx]);

  if (typeof document === "undefined" || !anchor_el || !is_open) return null;

  const highlighted = has_suggestions ? suggestions[Math.max(0, highlighted_idx)] : null;

  const content = (
    <div
      ref={panel_ref}
      className={styles.assist_panel}
      style={position ? { top: position.top, left: position.left } : { top: -9999, left: -9999 }}
      // Keeps focus (and the caret) in the formula editor while the panel is clicked.
      onMouseDown={(e) => e.preventDefault()}
      role={has_suggestions ? "listbox" : "tooltip"}
    >
      {has_suggestions ? (
        <>
          <div className={styles.assist_list}>
            {suggestions.map((info, idx) => (
              <button
                key={info.name}
                ref={(el) => {
                  item_refs.current[idx] = el;
                }}
                type="button"
                role="option"
                aria-selected={idx === highlighted_idx}
                className={`${styles.assist_item}${idx === highlighted_idx ? ` ${styles.assist_item_active}` : ""}`}
                onMouseEnter={() => onHighlightChange(idx)}
                onClick={() => onPick(info)}
              >
                <span className={styles.assist_name}>{info.name}</span>
                <span className={styles.assist_category}>{info.category}</span>
              </button>
            ))}
          </div>
          {highlighted && (
            <div className={styles.assist_detail}>
              <code className={styles.assist_signature}>{formatFunctionSignature(highlighted)}</code>
              <p className={styles.assist_description}>{highlighted.description}</p>
              <p className={styles.assist_keys}>
                <kbd>Tab</kbd> or <kbd>Enter</kbd> to insert
              </p>
            </div>
          )}
        </>
      ) : (
        call_info &&
        call && (
          <div className={styles.assist_detail}>
            <code className={styles.assist_signature}>
              {call_info.name}(
              {call_info.args.map((arg, idx) => (
                <React.Fragment key={`${arg}-${idx}`}>
                  {idx > 0 && ", "}
                  <span
                    className={
                      idx === getHighlightedArgIdx(call_info, call.arg_index) ? styles.assist_arg_active : undefined
                    }
                  >
                    {arg}
                  </span>
                </React.Fragment>
              ))}
              )
            </code>
            <p className={styles.assist_description}>{call_info.description}</p>
            {call_info.example && (
              <p className={styles.assist_example}>
                <span>Example</span>
                <code>={call_info.example}</code>
              </p>
            )}
          </div>
        )
      )}
    </div>
  );

  return createPortal(content, document.body);
}
