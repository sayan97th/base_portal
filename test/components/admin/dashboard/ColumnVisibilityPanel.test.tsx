/**
 * Tests for the Link Building Orders column chooser: grouped columns, searching
 * by name and hiding or showing a whole group.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ColumnVisibilityPanel, { type ColumnVisibilityGroup } from "@/components/admin/dashboard/ColumnVisibilityPanel";

const GROUPS: ColumnVisibilityGroup[] = [
  {
    key: "core",
    label: "Order Details",
    swatch_class: "bg-gray-700",
    columns: [
      { key: "keyword", label: "Keyword" },
      { key: "landing_page", label: "Landing Page" },
    ],
  },
  {
    key: "pricing",
    label: "Pricing and Approval",
    swatch_class: "bg-gray-300",
    columns: [{ key: "final_price", label: "Final Price" }],
  },
];

function renderPanel(hidden_columns: string[] = []) {
  const props = {
    groups: GROUPS,
    hidden_columns: new Set(hidden_columns),
    has_custom_widths: false,
    onToggleColumn: jest.fn(),
    onSetGroupHidden: jest.fn(),
    onShowAll: jest.fn(),
    onResetWidths: jest.fn(),
  };
  render(<ColumnVisibilityPanel {...props} />);
  return props;
}

describe("ColumnVisibilityPanel", () => {
  it("shows how many columns are visible and marks hidden ones as not pressed", () => {
    renderPanel(["final_price"]);

    expect(screen.getByText(/2 of 3 columns shown/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Keyword" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Final Price" })).toHaveAttribute("aria-pressed", "false");
  });

  it("toggles a single column and a whole group", () => {
    const props = renderPanel(["final_price"]);

    fireEvent.click(screen.getByRole("button", { name: "Keyword" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Hide group" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Show group" }));

    expect(props.onToggleColumn).toHaveBeenCalledWith("keyword");
    expect(props.onSetGroupHidden).toHaveBeenNthCalledWith(1, ["keyword", "landing_page"], true);
    expect(props.onSetGroupHidden).toHaveBeenNthCalledWith(2, ["final_price"], false);
  });

  it("narrows the list to the columns matching the search", () => {
    renderPanel();

    fireEvent.change(screen.getByRole("textbox", { name: "Find a column" }), { target: { value: "price" } });

    expect(screen.getByRole("button", { name: "Final Price" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Keyword" })).not.toBeInTheDocument();
    expect(screen.queryByText("Order Details")).not.toBeInTheDocument();
  });
});
