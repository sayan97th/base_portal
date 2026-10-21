/**
 * The formula editor input used by the cells, the formula bar and the formula
 * column dialog: function autocomplete, the argument hint, keyboard handling and
 * registration as the target of clicked cell references.
 */

import React, { useState } from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import FormulaInput, { assignRef } from "@/components/admin/dashboard/FormulaInput";
import {
  FormulaEditingContext,
  type ActiveFormulaEditor,
} from "@/components/admin/dashboard/FormulaEditingContext";

interface HarnessProps {
  initial?: string;
  formula_enabled?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  setActiveEditor?: (editor: ActiveFormulaEditor | null) => void;
}

/** A controlled FormulaInput, like its parents use it. */
function Harness({ initial = "", formula_enabled, onKeyDown, setActiveEditor = jest.fn() }: HarnessProps) {
  const [value, setValue] = useState(initial);
  return (
    <FormulaEditingContext.Provider value={{ setActiveEditor }}>
      <FormulaInput
        aria-label="Cell editor"
        value={value}
        onValueChange={setValue}
        onKeyDown={onKeyDown}
        formula_enabled={formula_enabled}
      />
    </FormulaEditingContext.Provider>
  );
}

function typeInto(input: HTMLInputElement, text: string): void {
  fireEvent.change(input, { target: { value: text } });
  input.setSelectionRange(text.length, text.length);
  fireEvent.select(input);
}

function renderFocused(props: HarnessProps = {}): HTMLInputElement {
  render(<Harness {...props} />);
  const input = screen.getByRole("textbox", { name: "Cell editor" }) as HTMLInputElement;
  fireEvent.focus(input);
  return input;
}

describe("FormulaInput", () => {
  it("behaves as a plain input for text that is not a formula", () => {
    const input = renderFocused();
    typeInto(input, "vlookup");
    expect(input.value).toBe("vlookup");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(input).not.toHaveAttribute("data-formula-editor");
  });

  it("marks a formula and turns spell checking off", () => {
    const input = renderFocused();
    typeInto(input, "=A1");
    expect(input).toHaveAttribute("data-formula-editor", "true");
    expect(input).toHaveAttribute("spellcheck", "false");
  });

  it("suggests functions matching the name being typed, with the signature of the highlighted one", () => {
    const input = renderFocused();
    typeInto(input, "=VLO");

    const listbox = screen.getByRole("listbox");
    const option = within(listbox).getByRole("option", { name: /VLOOKUP/ });
    expect(option).toHaveAttribute("aria-selected", "true");
    expect(listbox).toHaveTextContent("VLOOKUP(search_key, range, index, [is_sorted])");
    expect(listbox).toHaveTextContent("Use FALSE as is_sorted for an exact match.");
  });

  it("inserts the highlighted suggestion with Tab or Enter", () => {
    const input = renderFocused();
    typeInto(input, "=IFERROR(vlo");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(input.value).toBe("=IFERROR(VLOOKUP(");

    typeInto(input, "=IFERROR(VLOOKUP(A1, B:C, 2, FALSE), cou");
    fireEvent.keyDown(input, { key: "Tab" });
    expect(input.value).toBe("=IFERROR(VLOOKUP(A1, B:C, 2, FALSE), COUNT(");
  });

  it("moves the highlight with the arrow keys", () => {
    const input = renderFocused();
    typeInto(input, "=IF");
    const options = () => screen.getAllByRole("option");
    expect(options()[0]).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(options()[1]).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(input, { key: "ArrowUp" });
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(options()[0]).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    // Suggestions for "IF": IF, IFS, IFNA, IFERROR ...
    expect(input.value).toBe("=IFS(");
  });

  it("inserts a suggestion clicked with the mouse", () => {
    const input = renderFocused();
    typeInto(input, "=xlo");
    fireEvent.click(screen.getByRole("option", { name: /XLOOKUP/ }));
    expect(input.value).toBe("=XLOOKUP(");
  });

  it("closes the suggestions with the first Escape and passes the next one on", () => {
    const onKeyDown = jest.fn();
    const input = renderFocused({ onKeyDown });
    typeInto(input, "=VLO");

    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(onKeyDown).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: "Escape" });
    expect(onKeyDown).toHaveBeenCalledTimes(1);
  });

  it("passes the keys it does not use to the parent", () => {
    const onKeyDown = jest.fn();
    const input = renderFocused({ onKeyDown });
    typeInto(input, "=A1+1");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onKeyDown).toHaveBeenCalledWith(expect.objectContaining({ key: "Enter" }));
  });

  it("shows the argument hint of the function around the caret", () => {
    const input = renderFocused();
    typeInto(input, "=VLOOKUP(A1, ");

    const hint = screen.getByRole("tooltip");
    expect(hint).toHaveTextContent("VLOOKUP(search_key, range, index, [is_sorted])");
    expect(hint).toHaveTextContent("Example=VLOOKUP(E2, E:Z, 4, FALSE)");
  });

  it("hides the helper when the input loses focus", () => {
    const input = renderFocused();
    typeInto(input, "=VLO");
    fireEvent.blur(input);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("offers no help when formulas are disabled for the column", () => {
    const input = renderFocused({ formula_enabled: false });
    typeInto(input, "=VLO");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(input).not.toHaveAttribute("data-formula-editor");
  });

  it("registers itself as the target of clicked references while a formula is edited", () => {
    const setActiveEditor = jest.fn();
    const input = renderFocused({ setActiveEditor, initial: "=SUM(" });

    const editor = setActiveEditor.mock.calls.find(([value]) => value !== null)?.[0] as ActiveFormulaEditor;
    expect(editor.element).toBe(input);

    React.act(() => editor.setText("=SUM(S1:S9", 10));
    expect(input.value).toBe("=SUM(S1:S9");
    expect(input.selectionStart).toBe(10);

    fireEvent.blur(input);
    expect(setActiveEditor).toHaveBeenLastCalledWith(null);
  });
});

describe("assignRef", () => {
  it("sets callback and object refs, and ignores a missing one", () => {
    const element = document.createElement("input");
    const callback = jest.fn();
    assignRef(callback, element);
    expect(callback).toHaveBeenCalledWith(element);

    const object_ref = React.createRef<HTMLInputElement>();
    assignRef(object_ref, element);
    expect(object_ref.current).toBe(element);

    expect(() => assignRef(undefined, element)).not.toThrow();
  });
});
