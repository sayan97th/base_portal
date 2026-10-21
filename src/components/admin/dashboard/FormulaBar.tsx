"use client";

import React, { useEffect, useRef, useState } from "react";
import FormulaInput, { assignRef } from "./FormulaInput";
import styles from "./SpreadsheetFormulas.module.scss";

export type FormulaBarCommitDirection = "down" | "right" | null;

interface FormulaBarProps {
  /** Address of the active cell or range, e.g. "S14" or "B2:D9". */
  name_box_label: string | null;
  /** Jumps to the cell typed in the name box. Returns false when the address is not on this page. */
  onNameBoxSubmit: (address: string) => boolean;
  /** What the active cell holds: its formula when it has one, otherwise its full value. */
  cell_text: string;
  /** Text being typed into the bar, null while the bar is not being edited. */
  draft: string | null;
  onDraftChange: (text: string) => void;
  /** Focus on an editable cell's bar: the parent starts the edit with the cell's text. */
  onStartEdit: () => void;
  onCommit: (direction: FormulaBarCommitDirection) => void;
  onCancel: () => void;
  is_editable: boolean;
  /** True when the active cell's text is a formula. */
  is_formula: boolean;
  /** False for cells that cannot hold a formula, which turns the helper off. */
  formula_enabled: boolean;
  placeholder: string;
  /** Error a formula cell evaluates to, shown as a chip with its explanation. */
  error: { code: string; detail: string } | null;
  /** Explains the reach of the formula being edited, e.g. "Fills every row". */
  scope_label: string | null;
  onOpenFunctions: (anchor_el: HTMLElement) => void;
  input_ref?: React.Ref<HTMLInputElement>;
  /** Range totals and contextual badges, shown on the right. */
  children?: React.ReactNode;
}

/**
 * Google Sheets style formula bar: an editable name box (type an address to jump
 * to it), the fx button opening the function reference, and the active cell's
 * formula or value, editable in place with the same helper as the cells.
 */
export default function FormulaBar({
  name_box_label,
  onNameBoxSubmit,
  cell_text,
  draft,
  onDraftChange,
  onStartEdit,
  onCommit,
  onCancel,
  is_editable,
  is_formula,
  formula_enabled,
  placeholder,
  error,
  scope_label,
  onOpenFunctions,
  input_ref,
  children,
}: FormulaBarProps) {
  const [name_box_text, setNameBoxText] = useState("");
  const [is_name_box_editing, setIsNameBoxEditing] = useState(false);
  const [is_name_box_invalid, setIsNameBoxInvalid] = useState(false);
  const name_box_input_ref = useRef<HTMLInputElement>(null);
  const formula_input_ref = useRef<HTMLInputElement | null>(null);
  // Set when Enter, Tab or Escape already finished the edit, so the blur that follows does not commit it again.
  const finished_by_key_ref = useRef(false);

  useEffect(() => {
    if (!is_name_box_invalid) return;
    const timer = setTimeout(() => setIsNameBoxInvalid(false), 600);
    return () => clearTimeout(timer);
  }, [is_name_box_invalid]);

  useEffect(() => {
    if (!is_name_box_editing) return;
    name_box_input_ref.current?.focus();
    name_box_input_ref.current?.select();
  }, [is_name_box_editing]);

  const is_editing = draft !== null;
  const text = draft ?? cell_text;
  const is_formula_text = formula_enabled && text.trimStart().startsWith("=");

  // The input only exists while the bar is edited: focus it as soon as it mounts.
  useEffect(() => {
    if (!is_editing) return;
    const input = formula_input_ref.current;
    if (!input || document.activeElement === input) return;
    finished_by_key_ref.current = false;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }, [is_editing]);

  const setFormulaInputRef = (element: HTMLInputElement | null) => {
    formula_input_ref.current = element;
    assignRef(input_ref, element);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      finished_by_key_ref.current = true;
      onCommit(e.shiftKey ? null : "down");
    } else if (e.key === "Tab") {
      e.preventDefault();
      finished_by_key_ref.current = true;
      onCommit("right");
    } else if (e.key === "Escape") {
      e.preventDefault();
      finished_by_key_ref.current = true;
      onCancel();
    }
  };

  return (
    <div className={styles.bar} aria-label="Formula bar">
      {/* Name box: shows the active cell, click it and type an address to jump there */}
      {is_name_box_editing ? (
        <input
          ref={name_box_input_ref}
          className={`${styles.name_box}${is_name_box_invalid ? ` ${styles.name_box_invalid}` : ""}`}
          value={name_box_text}
          placeholder="A1"
          aria-label="Name box, type a cell address and press Enter to go to it"
          spellCheck={false}
          onBlur={() => setIsNameBoxEditing(false)}
          onChange={(e) => setNameBoxText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              setIsNameBoxEditing(false);
            } else if (e.key === "Enter") {
              e.preventDefault();
              if (onNameBoxSubmit(name_box_text.trim())) setIsNameBoxEditing(false);
              else setIsNameBoxInvalid(true);
            }
          }}
        />
      ) : (
        <button
          type="button"
          className={styles.name_box}
          title="Active cell"
          aria-label={`Active cell ${name_box_label ?? "none"}. Click to type an address and jump to it.`}
          onClick={() => {
            setNameBoxText(name_box_label ?? "");
            setIsNameBoxEditing(true);
          }}
        >
          {name_box_label ?? ""}
        </button>
      )}
      <button
        type="button"
        className={`${styles.fx_button}${is_formula ? ` ${styles.fx_button_formula}` : ""}`}
        // Keeps focus in a formula being typed, so the picked function lands at its caret.
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => onOpenFunctions(e.currentTarget)}
        title="Functions: browse every function and insert one"
        aria-label="Browse functions"
      >
        fx
      </button>
      <div className={styles.formula_field}>
        {is_editing ? (
          <FormulaInput
            input_ref={setFormulaInputRef}
            value={text}
            onValueChange={onDraftChange}
            onKeyDown={handleKeyDown}
            formula_enabled={formula_enabled}
            aria-label="Formula or value of the active cell"
            className={`${styles.formula_input} ${styles.formula_input_editing}${is_formula_text ? ` ${styles.formula_input_formula}` : ""}`}
            onFocus={() => {
              finished_by_key_ref.current = false;
            }}
            onBlur={() => {
              if (finished_by_key_ref.current) {
                finished_by_key_ref.current = false;
                return;
              }
              onCommit(null);
            }}
          />
        ) : (
          // Read only view of the active cell, a click turns it into the editor.
          <div
            className={`${styles.formula_display}${is_formula_text ? ` ${styles.formula_input_formula}` : ""}${
              is_editable ? ` ${styles.formula_display_editable}` : ""
            }`}
            title={text || undefined}
            onMouseDown={(e) => {
              if (!is_editable) return;
              e.preventDefault();
              onStartEdit();
            }}
          >
            {text ? text : <span className={styles.formula_placeholder}>{placeholder}</span>}
          </div>
        )}
        {scope_label && is_editing && <span className={styles.formula_scope_chip}>{scope_label}</span>}
        {error && !is_editing && (
          <span className={styles.formula_error_chip} title={error.detail}>
            <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error.code} {error.detail}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
