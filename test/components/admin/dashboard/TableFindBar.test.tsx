import React, { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import TableFindBar from "@/components/admin/dashboard/TableFindBar";

type FindBarProps = React.ComponentProps<typeof TableFindBar>;

function renderFindBar(overrides: Partial<FindBarProps> = {}) {
  const props: FindBarProps = {
    query: "seo",
    find_terms: ["seo"],
    match_count: 3,
    current_match_idx: 0,
    input_ref: createRef<HTMLInputElement>(),
    matched_row_count: 2,
    is_loading_more_rows: false,
    onQueryChange: jest.fn(),
    onNext: jest.fn(),
    onPrevious: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  };
  render(<TableFindBar {...props} />);
  return props;
}

function findInput(): HTMLElement {
  return screen.getByRole("textbox", { name: "Find in table" });
}

describe("TableFindBar", () => {
  it("counts the matches across every row, not per page", () => {
    renderFindBar({ match_count: 1250, current_match_idx: 4 });

    expect(screen.getByText("5 of 1,250")).toBeInTheDocument();
    expect(screen.queryByText(/on this page/)).not.toBeInTheDocument();
  });

  it("says how many orders hold a match", () => {
    renderFindBar({ matched_row_count: 2 });

    expect(screen.getByText("2 matching orders")).toBeInTheDocument();
  });

  it("uses the singular for one matching order", () => {
    renderFindBar({ match_count: 1, matched_row_count: 1 });

    expect(screen.getByText("1 matching order")).toBeInTheDocument();
  });

  it("mentions that more rows are still loading next to the matches", () => {
    renderFindBar({ is_loading_more_rows: true });

    expect(screen.getByText("2 matching orders, more rows are still loading")).toBeInTheDocument();
  });

  it("says it is still searching instead of no matches while rows are loading", () => {
    renderFindBar({ match_count: 0, current_match_idx: -1, matched_row_count: 0, is_loading_more_rows: true });

    expect(screen.getByText("Searching...")).toBeInTheDocument();
    expect(screen.queryByText("No matches")).not.toBeInTheDocument();
  });

  it("says there are no matches and disables the arrows once every row is loaded", () => {
    renderFindBar({ match_count: 0, current_match_idx: -1, matched_row_count: 0 });

    expect(screen.getByText("No matches")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next match" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Previous match" })).toBeDisabled();
  });

  it("shows no counter while the query is empty", () => {
    renderFindBar({ query: "", find_terms: [], match_count: 0, current_match_idx: -1, matched_row_count: 0 });

    expect(screen.queryByText("No matches")).not.toBeInTheDocument();
    expect(screen.queryByText(/matching order/)).not.toBeInTheDocument();
  });

  it("goes to the next match on Enter and to the previous one on Shift+Enter", () => {
    const props = renderFindBar();

    fireEvent.keyDown(findInput(), { key: "Enter" });
    fireEvent.keyDown(findInput(), { key: "Enter", shiftKey: true });

    expect(props.onNext).toHaveBeenCalledTimes(1);
    expect(props.onPrevious).toHaveBeenCalledTimes(1);
  });

  it("goes through the matches with the arrow buttons", () => {
    const props = renderFindBar();

    fireEvent.click(screen.getByRole("button", { name: "Next match" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous match" }));

    expect(props.onNext).toHaveBeenCalledTimes(1);
    expect(props.onPrevious).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape and on the close button", () => {
    const props = renderFindBar();

    fireEvent.keyDown(findInput(), { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Close find" }));

    expect(props.onClose).toHaveBeenCalledTimes(2);
  });

  it("reports what is typed", () => {
    const props = renderFindBar();

    fireEvent.change(findInput(), { target: { value: "ppc" } });

    expect(props.onQueryChange).toHaveBeenCalledWith("ppc");
  });

  it("lists several terms as chips and removes one when it is clicked", () => {
    const props = renderFindBar({ query: "BL-1, BL-2", find_terms: ["BL-1", "BL-2"] });

    fireEvent.click(screen.getByRole("button", { name: "Remove find term BL-1" }));

    expect(props.onQueryChange).toHaveBeenCalledWith("BL-2");
  });

  it("turns a pasted column of order ids into a comma separated list", () => {
    const props = renderFindBar({ query: "", find_terms: [] });

    fireEvent.paste(findInput(), { clipboardData: { getData: () => "BL-1\nBL-2\nBL-3" } });

    expect(props.onQueryChange).toHaveBeenCalledWith(expect.stringMatching(/^BL-1,\s*BL-2,\s*BL-3$/));
  });
});
