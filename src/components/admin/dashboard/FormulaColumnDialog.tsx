"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FORMULA_COLUMN_FORMATS, isFormulaText, parseFormula, type FormulaColumnFormat } from "@/lib/spreadsheet-formulas";
import FormulaInput from "./FormulaInput";
import styles from "./SpreadsheetFormulas.module.scss";

export interface FormulaColumnDraft {
  name: string;
  /** In A1 notation, written for the row numbered `first_row_number`. */
  formula: string;
  format: FormulaColumnFormat;
}

export interface FormulaPreviewRow {
  row_number: number;
  /** Short description of the row, e.g. its Order ID and company. */
  label: string;
  text: string;
  is_error: boolean;
  title?: string;
}

interface FormulaColumnDialogProps {
  mode: "create" | "edit";
  initial: FormulaColumnDraft;
  /** Row number the formula is written for (the first row on the page). */
  first_row_number: number;
  /** Columns that can be referenced, with their letter, for the "Insert column" picker. */
  reference_columns: ReadonlyArray<{ letter: string; label: string }>;
  /** Evaluates the formula on the first rows of the page. */
  getPreview: (formula: string, format: FormulaColumnFormat) => FormulaPreviewRow[];
  onSubmit: (draft: FormulaColumnDraft) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}

function getSyntaxError(formula: string): string | null {
  // The dialog opens with "=" typed, which is a formula not written yet, not a mistake.
  if (formula.trim() === "" || formula.trim() === "=") return null;
  if (!isFormulaText(formula)) return 'A formula starts with "=", for example =S5*2.';
  try {
    parseFormula(formula);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "The formula is not valid.";
  }
}

/**
 * Creates or edits a formula column: a column computed from the others, written
 * once and filled down every row, like dragging a formula down in Sheets.
 */
export default function FormulaColumnDialog({
  mode,
  initial,
  first_row_number,
  reference_columns,
  getPreview,
  onSubmit,
  onDelete,
  onClose,
}: FormulaColumnDialogProps) {
  const [name, setName] = useState(initial.name);
  const [formula, setFormula] = useState(initial.formula || "=");
  const [format, setFormat] = useState<FormulaColumnFormat>(initial.format);
  const [is_saving, setIsSaving] = useState(false);
  const [is_confirming_delete, setIsConfirmingDelete] = useState(false);
  const [submit_error, setSubmitError] = useState<string | null>(null);
  const [has_tried_submit, setHasTriedSubmit] = useState(false);
  const formula_input_ref = useRef<HTMLInputElement | null>(null);
  const name_input_ref = useRef<HTMLInputElement>(null);

  const syntax_error = getSyntaxError(formula);
  const is_formula_empty = formula.trim() === "" || formula.trim() === "=";
  const name_error = has_tried_submit && name.trim() === "" ? "Give the column a name." : null;
  const formula_error = syntax_error ?? (has_tried_submit && is_formula_empty ? "Write the formula of the column." : null);

  const preview = useMemo(
    () => (!is_formula_empty && !syntax_error ? getPreview(formula, format) : []),
    [is_formula_empty, syntax_error, getPreview, formula, format]
  );

  useEffect(() => {
    (mode === "create" ? name_input_ref.current : formula_input_ref.current)?.focus();
  }, [mode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !is_saving && !e.defaultPrevented) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [is_saving, onClose]);

  /** Inserts a column reference for the first row at the caret, like clicking a cell in Sheets. */
  const insertReference = (letter: string) => {
    const input = formula_input_ref.current;
    const reference = `${letter}${first_row_number}`;
    const base = formula.trimStart().startsWith("=") ? formula : `=${formula}`;
    const shift = base.length - formula.length;
    const start = input ? (input.selectionStart ?? formula.length) + shift : base.length;
    const end = input ? (input.selectionEnd ?? formula.length) + shift : base.length;
    const next = base.slice(0, start) + reference + base.slice(end);
    setFormula(next);
    requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(start + reference.length, start + reference.length);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasTriedSubmit(true);
    if (name.trim() === "" || is_formula_empty || syntax_error) return;
    setIsSaving(true);
    setSubmitError(null);
    try {
      await onSubmit({ name: name.trim(), formula: formula.trim(), format });
    } catch (error) {
      setSubmitError(
        error && typeof error === "object" && "message" in error && typeof error.message === "string"
          ? error.message
          : "The formula column could not be saved. Please try again."
      );
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!is_confirming_delete) {
      setIsConfirmingDelete(true);
      return;
    }
    setIsSaving(true);
    setSubmitError(null);
    try {
      await onDelete();
    } catch {
      setSubmitError("The formula column could not be deleted. Please try again.");
      setIsSaving(false);
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className={styles.dialog_root} role="dialog" aria-modal="true" aria-labelledby="formula-column-dialog-title">
      <div className={styles.dialog_backdrop} onClick={is_saving ? undefined : onClose} />
      <form className={styles.dialog} onSubmit={handleSubmit} noValidate>
        <div className={styles.dialog_header}>
          <span className={styles.dialog_icon} aria-hidden="true">fx</span>
          <div className="min-w-0 flex-1">
            <h2 id="formula-column-dialog-title" className={styles.dialog_title}>
              {mode === "create" ? "Add formula column" : "Edit formula column"}
            </h2>
            <p className={styles.dialog_subtitle}>
              Write the formula once for row {first_row_number}, it fills down every row like a column dragged down in
              Google Sheets. The whole team sees this column.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={is_saving}
            className="shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            aria-label="Close"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className={styles.dialog_body}>
          <div className={styles.field}>
            <label className={styles.field_label} htmlFor="formula-column-name">
              Column name
            </label>
            <input
              id="formula-column-name"
              ref={name_input_ref}
              className={`${styles.text_input}${name_error ? ` ${styles.text_input_invalid}` : ""}`}
              value={name}
              maxLength={100}
              placeholder="e.g. Days until delivery"
              onChange={(e) => setName(e.target.value)}
            />
            {name_error && <p className={styles.field_error}>{name_error}</p>}
          </div>

          <div className={styles.field}>
            <label className={styles.field_label} htmlFor="formula-column-formula">
              Formula
              <select
                className="h-6 max-w-[55%] rounded border border-gray-200 bg-white px-1 text-[11px] font-medium normal-case tracking-normal text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                value=""
                onChange={(e) => {
                  if (e.target.value) insertReference(e.target.value);
                }}
                aria-label="Insert a column reference"
              >
                <option value="">Insert column...</option>
                {reference_columns.map((column) => (
                  <option key={column.letter} value={column.letter}>
                    {column.letter} · {column.label}
                  </option>
                ))}
              </select>
            </label>
            <FormulaInput
              id="formula-column-formula"
              input_ref={formula_input_ref}
              value={formula}
              onValueChange={setFormula}
              className={`${styles.text_input} ${styles.formula_text_input}${formula_error ? ` ${styles.text_input_invalid}` : ""}`}
              placeholder={`=IF(L${first_row_number}="", "", L${first_row_number}-TODAY())`}
            />
            {formula_error ? (
              <p className={styles.field_error}>{formula_error}</p>
            ) : (
              <p className={styles.field_hint}>
                Use the letters of the column header, e.g. <code>=AA{first_row_number}-X{first_row_number}</code> for
                Final Price minus Current Price, <code>=SUM(AA:AA)</code> for a whole column, or{" "}
                <code>$AA$1</code> to always read the same cell.
              </p>
            )}
          </div>

          <div className={styles.field_row}>
            <div>
              <label className={styles.field_label} htmlFor="formula-column-format">
                Format
              </label>
              <select
                id="formula-column-format"
                className={styles.select_input}
                value={format}
                onChange={(e) => setFormat(e.target.value as FormulaColumnFormat)}
              >
                {FORMULA_COLUMN_FORMATS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} ({option.example})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {preview.length > 0 && (
            <div className={styles.preview} aria-live="polite">
              <p className={styles.preview_title}>Preview on this page</p>
              {preview.map((row) => (
                <div key={row.row_number} className={styles.preview_row}>
                  <span className={styles.preview_row_number}>{row.row_number}</span>
                  <span className={styles.preview_label}>{row.label}</span>
                  <span
                    className={`${styles.preview_value}${row.is_error ? ` ${styles.preview_value_error}` : ""}`}
                    title={row.title}
                  >
                    {row.text === "" ? <span className="font-normal opacity-50">(empty)</span> : row.text}
                  </span>
                </div>
              ))}
            </div>
          )}

          {submit_error && <p className={styles.field_error}>{submit_error}</p>}
        </div>

        <div className={styles.dialog_footer}>
          <div>
            {onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={is_saving}
                className={`${styles.button} ${is_confirming_delete ? styles.button_danger_confirm : styles.button_danger}`}
              >
                {is_confirming_delete ? "Click again to delete" : "Delete column"}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} disabled={is_saving} className={styles.button}>
              Cancel
            </button>
            <button type="submit" disabled={is_saving} className={`${styles.button} ${styles.button_primary}`}>
              {is_saving ? "Saving..." : mode === "create" ? "Add column" : "Save changes"}
            </button>
          </div>
        </div>
      </form>
    </div>,
    document.body
  );
}
