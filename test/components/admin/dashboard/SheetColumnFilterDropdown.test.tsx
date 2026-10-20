/**
 * Tests for the spreadsheet style column filter menu used by the Link Building
 * Orders table. Unlike the table tests, the real (300 ms) search debounce runs
 * here, so the "type a search and click Apply right away" path is covered.
 */

import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import SheetColumnFilterDropdown from "@/components/admin/dashboard/SheetColumnFilterDropdown";
import type { LinkBuildingOrderFilterValuesResponse } from "@/types/admin/link-building-order";

const ALL_COMPANIES: LinkBuildingOrderFilterValuesResponse = {
  data: [
    { value: "", count: 3 },
    { value: "Acme Corp", count: 4 },
    { value: "The Mather Group", count: 136 },
    { value: "The Mather Group LLC", count: 100 },
  ],
  total_distinct: 4,
  has_more: false,
};

/** Mimics the backend: the value search narrows the list to values containing it. */
function makeLoadValues() {
  return jest.fn(async (value_search: string): Promise<LinkBuildingOrderFilterValuesResponse> => {
    const data = ALL_COMPANIES.data.filter((item) =>
      item.value.toLowerCase().includes(value_search.toLowerCase())
    );
    return { data, total_distinct: data.length, has_more: false };
  });
}

function renderMenu(overrides: Partial<React.ComponentProps<typeof SheetColumnFilterDropdown>> = {}) {
  const props: React.ComponentProps<typeof SheetColumnFilterDropdown> = {
    col_label: "Company",
    is_sortable: true,
    sort_direction: null,
    current_filter: undefined,
    anchor_el: document.body,
    loadValues: makeLoadValues(),
    onSort: jest.fn(),
    onApply: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  };
  render(<SheetColumnFilterDropdown {...props} />);
  return props;
}

describe("SheetColumnFilterDropdown", () => {
  it("applies every matching variation when Apply is clicked right after typing a search", async () => {
    const props = renderMenu();
    await screen.findByText("Acme Corp");

    fireEvent.change(screen.getByRole("textbox", { name: "Search values" }), { target: { value: "mather" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    await waitFor(() =>
      expect(props.onApply).toHaveBeenCalledWith({
        condition: null,
        values: { mode: "include", values: ["The Mather Group", "The Mather Group LLC"] },
      })
    );
    expect(props.onClose).toHaveBeenCalled();
  });

  it("applies two hand-picked values of the same column", async () => {
    const props = renderMenu();
    await screen.findByText("Acme Corp");

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /^Acme Corp/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /^The Mather Group LLC/ }));
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(props.onApply).toHaveBeenCalledWith({
      condition: null,
      values: { mode: "include", values: ["Acme Corp", "The Mather Group LLC"] },
    });
  });

  it("stores unchecking a few values as an exclude list", async () => {
    const props = renderMenu();
    await screen.findByText("Acme Corp");

    fireEvent.click(screen.getByRole("checkbox", { name: /^\(Blanks\)/ }));
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(props.onApply).toHaveBeenCalledWith({
      condition: null,
      values: { mode: "exclude", values: [""] },
    });
  });

  it("restores the current filter's checked values when reopened", async () => {
    renderMenu({
      current_filter: { condition: null, values: { mode: "include", values: ["Acme Corp"] } },
    });
    await screen.findByText("Acme Corp");

    expect(screen.getByRole("checkbox", { name: /^Acme Corp/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /^The Mather Group LLC/ })).not.toBeChecked();
  });

  it("sorts the column from the menu", async () => {
    const props = renderMenu();
    fireEvent.click(screen.getByRole("button", { name: "Sort Z to A" }));
    expect(props.onSort).toHaveBeenCalledWith("desc");
    await screen.findByText("Acme Corp");
  });
});
