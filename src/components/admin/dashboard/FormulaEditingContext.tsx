"use client";

import { createContext, useContext } from "react";

/** The formula editor that has focus right now (a cell input, the formula bar, a totals cell). */
export interface ActiveFormulaEditor {
  element: HTMLInputElement;
  /** Replaces the editor's text and moves the caret, used to insert a clicked cell's reference. */
  setText: (text: string, caret: number) => void;
}

export interface FormulaEditingContextValue {
  setActiveEditor: (editor: ActiveFormulaEditor | null) => void;
}

const noop: FormulaEditingContextValue = { setActiveEditor: () => {} };

/**
 * Lets the spreadsheet know which formula editor has focus, so clicking a cell
 * while a formula is being typed inserts that cell's reference into it, like
 * Google Sheets does, instead of leaving the editor.
 */
export const FormulaEditingContext = createContext<FormulaEditingContextValue>(noop);

export function useFormulaEditing(): FormulaEditingContextValue {
  return useContext(FormulaEditingContext);
}
