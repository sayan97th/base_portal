/**
 * The Google Sheets style formula bar: the name box (jump to an address), the fx
 * button, the read only view of the active cell, and editing it in place.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import FormulaBar from "@/components/admin/dashboard/FormulaBar";

type FormulaBarProps = React.ComponentProps<typeof FormulaBar>;

function renderBar(overrides: Partial<FormulaBarProps> = {}) {
  const props: FormulaBarProps = {
    name_box_label: "S4",
    onNameBoxSubmit: jest.fn(() => true),
    cell_text: "=VLOOKUP(D4, D:AA, 24, FALSE)",
    draft: null,
    onDraftChange: jest.fn(),
    onStartEdit: jest.fn(),
    onCommit: jest.fn(),
    onCancel: jest.fn(),
    is_editable: true,
    is_formula: true,
    formula_enabled: true,
    placeholder: "Final Price is empty",
    error: null,
    scope_label: null,
    onOpenFunctions: jest.fn(),
    ...overrides,
  };
  const view = render(<FormulaBar {...props} />);
  return { ...view, props };
}

const formulaInput = () => screen.getByRole("textbox", { name: "Formula or value of the active cell" });

describe("FormulaBar name box", () => {
  it("shows the active cell", () => {
    renderBar();
    expect(screen.getByTitle("Active cell")).toHaveTextContent("S4");
  });

  it("jumps to a typed address with Enter", () => {
    const { props } = renderBar();
    fireEvent.click(screen.getByTitle("Active cell"));
    const input = screen.getByRole("textbox", { name: /Name box/ });
    expect(input).toHaveValue("S4");

    fireEvent.change(input, { target: { value: "  AA12 " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(props.onNameBoxSubmit).toHaveBeenCalledWith("AA12");
    expect(screen.queryByRole("textbox", { name: /Name box/ })).not.toBeInTheDocument();
  });

  it("stays open when the address is not on the page", () => {
    const { props } = renderBar({ onNameBoxSubmit: jest.fn(() => false) });
    fireEvent.click(screen.getByTitle("Active cell"));
    const input = screen.getByRole("textbox", { name: /Name box/ });
    fireEvent.change(input, { target: { value: "ZZ999" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(props.onNameBoxSubmit).toHaveBeenCalledWith("ZZ999");
    expect(screen.getByRole("textbox", { name: /Name box/ })).toBeInTheDocument();
  });

  it("closes with Escape without jumping", () => {
    const { props } = renderBar();
    fireEvent.click(screen.getByTitle("Active cell"));
    fireEvent.keyDown(screen.getByRole("textbox", { name: /Name box/ }), { key: "Escape" });
    expect(props.onNameBoxSubmit).not.toHaveBeenCalled();
    expect(screen.getByTitle("Active cell")).toBeInTheDocument();
  });
});

describe("FormulaBar read only view", () => {
  it("shows the active cell's formula, or a placeholder when it is empty", () => {
    const { rerender, props } = renderBar();
    expect(screen.getByText("=VLOOKUP(D4, D:AA, 24, FALSE)")).toBeInTheDocument();

    rerender(<FormulaBar {...props} cell_text="" />);
    expect(screen.getByText("Final Price is empty")).toBeInTheDocument();
  });

  it("starts editing an editable cell on mouse down", () => {
    const { props } = renderBar();
    fireEvent.mouseDown(screen.getByText("=VLOOKUP(D4, D:AA, 24, FALSE)"));
    expect(props.onStartEdit).toHaveBeenCalledTimes(1);
  });

  it("does not edit a read only cell", () => {
    const { props } = renderBar({ is_editable: false });
    fireEvent.mouseDown(screen.getByText("=VLOOKUP(D4, D:AA, 24, FALSE)"));
    expect(props.onStartEdit).not.toHaveBeenCalled();
  });

  it("explains the error a formula evaluates to", () => {
    renderBar({ error: { code: "#N/A", detail: 'Did not find value "Custom" in VLOOKUP evaluation.' } });
    const chip = screen.getByTitle('Did not find value "Custom" in VLOOKUP evaluation.');
    expect(chip).toHaveTextContent('#N/A Did not find value "Custom" in VLOOKUP evaluation.');
  });

  it("opens the function reference from the fx button", () => {
    const { props } = renderBar();
    const button = screen.getByRole("button", { name: "Browse functions" });
    expect(fireEvent.mouseDown(button)).toBe(false);
    fireEvent.click(button);
    expect(props.onOpenFunctions).toHaveBeenCalledWith(button);
  });

  it("shows extra content passed by the table", () => {
    render(
      <FormulaBar {...renderBar().props}>
        <span>Sum: 1,250</span>
      </FormulaBar>
    );
    expect(screen.getByText("Sum: 1,250")).toBeInTheDocument();
  });
});

describe("FormulaBar editing", () => {
  it("focuses the editor with the draft and reports changes", () => {
    const { props } = renderBar({ draft: "=VLOOKUP(D4, D:AA, 24, FALSE)", scope_label: "Fills every row" });
    const input = formulaInput();
    expect(input).toHaveFocus();
    expect(input).toHaveValue("=VLOOKUP(D4, D:AA, 24, FALSE)");
    expect(screen.getByText("Fills every row")).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "=VLOOKUP(D4, D:AA, 23, FALSE)" } });
    expect(props.onDraftChange).toHaveBeenCalledWith("=VLOOKUP(D4, D:AA, 23, FALSE)");
  });

  it("hides the error chip while editing", () => {
    renderBar({ draft: "=1/0", error: { code: "#DIV/0!", detail: "Division by zero." } });
    expect(screen.queryByTitle("Division by zero.")).not.toBeInTheDocument();
  });

  it("commits down with Enter, in place with Shift+Enter and right with Tab", () => {
    const { props } = renderBar({ draft: "=1" });
    fireEvent.keyDown(formulaInput(), { key: "Enter" });
    fireEvent.keyDown(formulaInput(), { key: "Enter", shiftKey: true });
    fireEvent.keyDown(formulaInput(), { key: "Tab" });
    expect((props.onCommit as jest.Mock).mock.calls).toEqual([["down"], [null], ["right"]]);
  });

  it("cancels with Escape", () => {
    const { props } = renderBar({ draft: "=1" });
    fireEvent.keyDown(formulaInput(), { key: "Escape" });
    expect(props.onCancel).toHaveBeenCalledTimes(1);
    expect(props.onCommit).not.toHaveBeenCalled();
  });

  it("commits once when the editor loses focus, and not again after a key finished the edit", () => {
    const { props } = renderBar({ draft: "=1" });
    fireEvent.keyDown(formulaInput(), { key: "Enter" });
    fireEvent.blur(formulaInput());
    expect(props.onCommit).toHaveBeenCalledTimes(1);

    fireEvent.focus(formulaInput());
    fireEvent.blur(formulaInput());
    expect(props.onCommit).toHaveBeenCalledTimes(2);
    expect(props.onCommit).toHaveBeenLastCalledWith(null);
  });

  it("lets the helper take Enter while it suggests a function", () => {
    const { props, rerender } = renderBar({ draft: "=" });
    const input = formulaInput() as HTMLInputElement;
    rerender(<FormulaBar {...props} draft="=VLO" />);
    input.setSelectionRange(4, 4);
    fireEvent.select(input);

    fireEvent.keyDown(input, { key: "Enter" });
    expect(props.onDraftChange).toHaveBeenCalledWith("=VLOOKUP(");
    expect(props.onCommit).not.toHaveBeenCalled();
  });
});
