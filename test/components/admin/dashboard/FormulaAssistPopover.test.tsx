/**
 * The floating helper under a formula editor: the list of matching functions,
 * or the argument hint of the function around the caret.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import FormulaAssistPopover from "@/components/admin/dashboard/FormulaAssistPopover";
import { getFunctionInfo, suggestFunctions } from "@/lib/spreadsheet-formulas";

function anchor(): HTMLElement {
  const element = document.createElement("input");
  document.body.appendChild(element);
  return element;
}

const noop = () => {};

describe("FormulaAssistPopover", () => {
  it("renders nothing without an anchor or without anything to show", () => {
    const { container, rerender } = render(
      <FormulaAssistPopover
        anchor_el={null}
        suggestions={suggestFunctions("VL")}
        highlighted_idx={0}
        onHighlightChange={noop}
        onPick={noop}
        call={null}
        call_info={null}
      />
    );
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

    rerender(
      <FormulaAssistPopover
        anchor_el={anchor()}
        suggestions={[]}
        highlighted_idx={0}
        onHighlightChange={noop}
        onPick={noop}
        call={null}
        call_info={null}
      />
    );
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("lists the suggestions with their category and details of the highlighted one", () => {
    const suggestions = suggestFunctions("IF");
    render(
      <FormulaAssistPopover
        anchor_el={anchor()}
        suggestions={suggestions}
        highlighted_idx={1}
        onHighlightChange={noop}
        onPick={noop}
        call={null}
        call_info={null}
      />
    );

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(suggestions.length);
    expect(options[0]).toHaveTextContent("IFLogical");
    expect(options[1]).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("listbox")).toHaveTextContent("IFS(condition1, value1, [condition2, value2, ...])");
    expect(screen.getByRole("listbox")).toHaveTextContent("Tab or Enter to insert");
  });

  it("reports hovered and clicked suggestions", () => {
    const onHighlightChange = jest.fn();
    const onPick = jest.fn();
    const suggestions = suggestFunctions("XL");
    render(
      <FormulaAssistPopover
        anchor_el={anchor()}
        suggestions={suggestions}
        highlighted_idx={0}
        onHighlightChange={onHighlightChange}
        onPick={onPick}
        call={null}
        call_info={null}
      />
    );

    const option = screen.getByRole("option", { name: /XLOOKUP/ });
    fireEvent.mouseEnter(option);
    expect(onHighlightChange).toHaveBeenCalledWith(0);
    fireEvent.click(option);
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ name: "XLOOKUP" }));
  });

  it("keeps the focus in the editor when the panel is clicked", () => {
    render(
      <FormulaAssistPopover
        anchor_el={anchor()}
        suggestions={suggestFunctions("SU")}
        highlighted_idx={0}
        onHighlightChange={noop}
        onPick={noop}
        call={null}
        call_info={null}
      />
    );
    // fireEvent returns false when the default action was prevented.
    expect(fireEvent.mouseDown(screen.getByRole("listbox"))).toBe(false);
  });

  it("shows the syntax, description and example of the function around the caret", () => {
    render(
      <FormulaAssistPopover
        anchor_el={anchor()}
        suggestions={[]}
        highlighted_idx={0}
        onHighlightChange={noop}
        onPick={noop}
        call={{ name: "VLOOKUP", arg_index: 2 }}
        call_info={getFunctionInfo("VLOOKUP")!}
      />
    );

    const hint = screen.getByRole("tooltip");
    expect(hint).toHaveTextContent("VLOOKUP(search_key, range, index, [is_sorted])");
    expect(hint).toHaveTextContent("Searches the first column of a range");
    expect(hint).toHaveTextContent("Example=VLOOKUP(E2, E:Z, 4, FALSE)");
  });

  it("shows the hint of a function without an example", () => {
    render(
      <FormulaAssistPopover
        anchor_el={anchor()}
        suggestions={[]}
        highlighted_idx={0}
        onHighlightChange={noop}
        onPick={noop}
        call={{ name: "HLOOKUP", arg_index: 9 }}
        call_info={getFunctionInfo("HLOOKUP")!}
      />
    );

    const hint = screen.getByRole("tooltip");
    expect(hint).toHaveTextContent("HLOOKUP(search_key, range, index, [is_sorted])");
    expect(hint).not.toHaveTextContent("Example");
  });

  it("prefers the suggestions over the argument hint", () => {
    render(
      <FormulaAssistPopover
        anchor_el={anchor()}
        suggestions={suggestFunctions("CO")}
        highlighted_idx={0}
        onHighlightChange={noop}
        onPick={noop}
        call={{ name: "IF", arg_index: 0 }}
        call_info={getFunctionInfo("IF")!}
      />
    );
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
