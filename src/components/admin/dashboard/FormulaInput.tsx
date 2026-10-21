"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  applyFunctionSuggestion,
  getFormulaAssistContext,
  getFunctionInfo,
  suggestFunctions,
  type FunctionInfo,
} from "@/lib/spreadsheet-formulas";
import FormulaAssistPopover from "./FormulaAssistPopover";
import { useFormulaEditing } from "./FormulaEditingContext";

type NativeInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "onKeyDown" | "ref">;

export interface FormulaInputProps extends NativeInputProps {
  value: string;
  onValueChange: (text: string) => void;
  /** Keys the formula helper did not use (it takes the arrows, Tab and Enter while suggesting). */
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  input_ref?: React.Ref<HTMLInputElement>;
  /** Element the helper popover sits under. Defaults to the input. */
  anchor_el?: HTMLElement | null;
  /** False turns the input into a plain text input (columns that cannot hold a formula). */
  formula_enabled?: boolean;
}

/** Sets a ref passed in by a parent, whether it is a callback or an object ref. */
export function assignRef<T>(ref: React.Ref<T> | undefined, value: T | null): void {
  if (!ref) return;
  if (typeof ref === "function") ref(value);
  else (ref as React.MutableRefObject<T | null>).current = value;
}

/**
 * Text input that becomes a formula editor as soon as its text starts with "=":
 * function name autocomplete, the syntax of the function being typed, and clicked
 * cells inserted as references (through FormulaEditingContext).
 */
export default function FormulaInput({
  value,
  onValueChange,
  onKeyDown,
  input_ref,
  anchor_el,
  formula_enabled = true,
  onFocus,
  onBlur,
  onSelect,
  ...input_props
}: FormulaInputProps) {
  const element_ref = useRef<HTMLInputElement | null>(null);
  // Kept in state as well, so the popover gets its anchor on the render the input mounts.
  const [input_el, setInputEl] = useState<HTMLInputElement | null>(null);
  const [caret, setCaret] = useState(value.length);
  const [highlighted_idx, setHighlightedIdx] = useState(0);
  const [dismissed_token, setDismissedToken] = useState<string | null>(null);
  const [is_focused, setIsFocused] = useState(false);
  const pending_caret_ref = useRef<number | null>(null);
  const { setActiveEditor } = useFormulaEditing();

  const is_formula = formula_enabled && value.trimStart().startsWith("=");

  const assist = useMemo(
    () => (is_formula && is_focused ? getFormulaAssistContext(value, caret) : { name_token: null, call: null }),
    [is_formula, is_focused, value, caret]
  );

  const token_key = assist.name_token ? `${assist.name_token.start}:${assist.name_token.text}` : null;
  const suggestions = useMemo(
    () => (assist.name_token && token_key !== dismissed_token ? suggestFunctions(assist.name_token.text) : []),
    [assist.name_token, token_key, dismissed_token]
  );
  const call_info = assist.call ? (getFunctionInfo(assist.call.name) ?? null) : null;

  // A new name being typed starts with its first suggestion highlighted.
  const [highlight_token, setHighlightToken] = useState(token_key);
  if (highlight_token !== token_key) {
    setHighlightToken(token_key);
    setHighlightedIdx(0);
  }

  const setRefs = useCallback(
    (element: HTMLInputElement | null) => {
      element_ref.current = element;
      setInputEl(element);
      assignRef(input_ref, element);
    },
    [input_ref]
  );

  const syncCaret = () => {
    const element = element_ref.current;
    if (element) setCaret(element.selectionStart ?? element.value.length);
  };

  // Puts the caret where an inserted suggestion or reference ends, once the new text is rendered.
  useLayoutEffect(() => {
    const element = element_ref.current;
    const pending = pending_caret_ref.current;
    if (!element || pending === null) return;
    pending_caret_ref.current = null;
    element.setSelectionRange(pending, pending);
    setCaret(pending);
  }, [value]);

  const setTextAndCaret = useCallback(
    (text: string, next_caret: number) => {
      pending_caret_ref.current = next_caret;
      onValueChange(text);
    },
    [onValueChange]
  );

  // While focused on a formula, this input is the target of clicked cell references.
  useEffect(() => {
    const element = element_ref.current;
    if (!is_focused || !is_formula || !element) return;
    setActiveEditor({ element, setText: setTextAndCaret });
    return () => setActiveEditor(null);
  }, [is_focused, is_formula, setActiveEditor, setTextAndCaret]);

  const pickSuggestion = (info: FunctionInfo) => {
    if (!assist.name_token) return;
    const next = applyFunctionSuggestion(value, assist.name_token, info.name);
    setTextAndCaret(next.text, next.caret);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIdx((idx) => Math.min(idx + 1, suggestions.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIdx((idx) => Math.max(idx - 1, 0));
        return;
      }
      if ((e.key === "Tab" || e.key === "Enter") && !e.shiftKey) {
        e.preventDefault();
        pickSuggestion(suggestions[Math.max(0, highlighted_idx)]);
        return;
      }
      if (e.key === "Escape") {
        // First Escape only closes the suggestions, the next one cancels the edit.
        e.preventDefault();
        e.stopPropagation();
        setDismissedToken(token_key);
        return;
      }
    }
    onKeyDown?.(e);
  };

  return (
    <>
      <input
        {...input_props}
        ref={setRefs}
        type="text"
        value={value}
        spellCheck={is_formula ? false : input_props.spellCheck}
        autoComplete="off"
        data-formula-editor={is_formula ? "true" : undefined}
        onChange={(e) => {
          setCaret(e.target.selectionStart ?? e.target.value.length);
          onValueChange(e.target.value);
        }}
        onKeyDown={handleKeyDown}
        onKeyUp={syncCaret}
        onClick={syncCaret}
        onSelect={(e) => {
          syncCaret();
          onSelect?.(e);
        }}
        onFocus={(e) => {
          setIsFocused(true);
          syncCaret();
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          setDismissedToken(null);
          onBlur?.(e);
        }}
      />
      {is_formula && is_focused && (
        <FormulaAssistPopover
          anchor_el={anchor_el ?? input_el}
          suggestions={suggestions}
          highlighted_idx={highlighted_idx}
          onHighlightChange={setHighlightedIdx}
          onPick={pickSuggestion}
          call={assist.call}
          call_info={call_info}
        />
      )}
    </>
  );
}
