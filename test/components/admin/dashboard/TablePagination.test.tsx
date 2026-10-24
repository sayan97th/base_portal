/**
 * Tests for the Link Building Orders table footer: the page number window and
 * the page / rows per page callbacks.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import TablePagination, { buildPageItems } from "@/components/admin/dashboard/TablePagination";

function renderPagination(overrides: Partial<React.ComponentProps<typeof TablePagination>> = {}) {
  const props: React.ComponentProps<typeof TablePagination> = {
    is_loading: false,
    has_loaded_once: true,
    total: 500,
    from_row: 51,
    to_row: 100,
    page_row_count: 50,
    visible_column_count: 20,
    total_column_count: 28,
    current_page: 2,
    last_page: 10,
    per_page: 50,
    per_page_options: [10, 50, 100],
    onPageChange: jest.fn(),
    onPerPageChange: jest.fn(),
    ...overrides,
  };
  render(<TablePagination {...props} />);
  return props;
}

describe("buildPageItems", () => {
  it("lists every page when there are seven or fewer", () => {
    expect(buildPageItems(3, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("keeps the first and last page and marks the gaps around the current one", () => {
    expect(buildPageItems(6, 12)).toEqual([1, null, 5, 6, 7, null, 12]);
  });

  it("does not add a gap next to the first or last page", () => {
    expect(buildPageItems(2, 12)).toEqual([1, 2, 3, null, 12]);
    expect(buildPageItems(11, 12)).toEqual([1, null, 10, 11, 12]);
  });
});

describe("TablePagination", () => {
  it("shows the row range and the column count", () => {
    renderPagination();

    expect(screen.getByText("51 to 100")).toBeInTheDocument();
    expect(screen.getByText(/20 of 28 columns visible/)).toBeInTheDocument();
  });

  it("marks the current page and moves to the clicked one", () => {
    const props = renderPagination();

    expect(screen.getByRole("button", { name: "2" })).toHaveAttribute("aria-current", "page");
    fireEvent.click(screen.getByRole("button", { name: "10" }));
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));

    expect(props.onPageChange).toHaveBeenNthCalledWith(1, 10);
    expect(props.onPageChange).toHaveBeenNthCalledWith(2, 3);
  });

  it("disables Previous on the first page and reports a new rows per page value", () => {
    const props = renderPagination({ current_page: 1 });

    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "100" } });

    expect(props.onPerPageChange).toHaveBeenCalledWith(100);
  });
});

describe("TablePagination selection summary", () => {
  it("renders the selection summary slot next to the page controls", () => {
    renderPagination({ selection_summary: <span>Sum: 1,250</span> });
    expect(screen.getByText("Sum: 1,250")).toBeInTheDocument();
  });
});
