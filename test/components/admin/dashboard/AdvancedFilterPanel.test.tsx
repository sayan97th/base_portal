/**
 * Tests for the monday style "Advanced filters" panel of the admin Link Building
 * Orders table: building rules, joining them with And / Or, groups, pausing,
 * duplicating and removing.
 */

import React from "react";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import AdvancedFilterPanel from "@/components/admin/dashboard/AdvancedFilterPanel";
import { useAdvancedFilters } from "@/hooks/useAdvancedFilters";
import { toAdvancedFiltersPayload, type AdvancedFilterColumn } from "@/lib/link-building-advanced-filters";
import type { LinkBuildingOrderAdvancedFilters } from "@/types/admin/link-building-order";

const COLUMNS: AdvancedFilterColumn[] = [
  { key: "status", label: "Status", kind: "option", options: ["Live", "Writing"] },
  { key: "keyword", label: "Keyword", kind: "text" },
  { key: "dr_lbs", label: "DR", kind: "number" },
];

let latest_filters: LinkBuildingOrderAdvancedFilters;

function Harness({ loadValues = jest.fn().mockResolvedValue([]) }: { loadValues?: (key: string, search: string) => Promise<string[]> }) {
  const { advanced_filters, advanced_filter_actions } = useAdvancedFilters();
  latest_filters = advanced_filters;
  return (
    <div data-testid="panel">
      <AdvancedFilterPanel
        columns={COLUMNS}
        advanced_filters={advanced_filters}
        actions={advanced_filter_actions}
        loadValues={loadValues}
      />
    </div>
  );
}

function openPanel() {
  return screen.getByTestId("panel");
}

/** Opens a field menu inside `container` and picks an option by its visible text. */
function pick(container: HTMLElement, field_label: string, option_text: string, index = 0) {
  fireEvent.click(within(container).getAllByRole("button", { name: field_label })[index]);
  fireEvent.click(within(container).getByRole("option", { name: option_text }));
}

describe("AdvancedFilterPanel", () => {
  it("shows the empty state until a filter is added", () => {
    render(<Harness />);
    expect(within(openPanel()).getByText("No filters yet")).toBeInTheDocument();
  });

  it("builds a Status is Live rule", () => {
    render(<Harness />);
    const panel = openPanel();

    fireEvent.click(within(panel).getByRole("button", { name: "New filter" }));
    expect(within(panel).getByText("Where")).toBeInTheDocument();
    expect(within(panel).getByText("Complete a filter to apply it to the table.")).toBeInTheDocument();

    pick(panel, "Column", "Status");
    // "is" is the default condition of an option column.
    expect(within(panel).getByRole("button", { name: "Condition" })).toHaveTextContent("is");

    fireEvent.click(within(panel).getByRole("button", { name: "Status values" }));
    fireEvent.click(within(panel).getByRole("checkbox", { name: "Live" }));
    fireEvent.click(within(panel).getByRole("checkbox", { name: "Writing" }));
    // Picked values show as removable chips in the field, like monday.
    fireEvent.click(within(panel).getByRole("button", { name: "Remove Writing" }));

    expect(toAdvancedFiltersPayload(latest_filters)).toEqual({
      operator: "and",
      rules: [{ key: "status", type: "values", mode: "include", values: ["Live"] }],
      groups: [],
    });
  });

  it("joins rules with Or when the second rule's join is changed", () => {
    render(<Harness />);
    const panel = openPanel();

    fireEvent.click(within(panel).getByRole("button", { name: "New filter" }));
    fireEvent.click(within(panel).getByRole("button", { name: "New filter" }));
    pick(panel, "Join filters with", "Or");

    expect(latest_filters.operator).toBe("or");
    expect(latest_filters.rules).toHaveLength(2);
  });

  it("types a value into a text rule and pauses, duplicates and removes rules", () => {
    render(<Harness />);
    const panel = openPanel();

    fireEvent.click(within(panel).getByRole("button", { name: "New filter" }));
    pick(panel, "Column", "Keyword");
    fireEvent.change(within(panel).getByLabelText("Keyword value"), { target: { value: "hosting" } });
    expect(latest_filters.rules[0]).toMatchObject({ key: "keyword", operator: "text_contains", value: "hosting" });

    fireEvent.click(within(panel).getByRole("button", { name: "Duplicate this filter" }));
    expect(latest_filters.rules).toHaveLength(2);
    expect(latest_filters.rules[1]).toMatchObject({ key: "keyword", value: "hosting" });
    expect(latest_filters.rules[1].id).not.toBe(latest_filters.rules[0].id);

    fireEvent.click(within(panel).getAllByRole("button", { name: "Pause this filter" })[0]);
    expect(latest_filters.rules[0].is_disabled).toBe(true);
    expect(toAdvancedFiltersPayload(latest_filters)?.rules).toHaveLength(1);

    fireEvent.click(within(panel).getAllByRole("button", { name: "Remove this filter" })[0]);
    expect(latest_filters.rules).toHaveLength(1);
  });

  it("adds condition groups with their own join", () => {
    render(<Harness />);
    const panel = openPanel();

    fireEvent.click(within(panel).getByRole("button", { name: "New group" }));
    expect(within(panel).getByText("Condition group")).toBeInTheDocument();
    fireEvent.click(within(panel).getByRole("button", { name: "New filter in group" }));
    pick(panel, "Join filters with", "Or");

    expect(latest_filters.groups).toHaveLength(1);
    expect(latest_filters.groups[0]).toMatchObject({ operator: "or" });
    expect(latest_filters.groups[0].rules).toHaveLength(2);
    expect(latest_filters.operator).toBe("and");

    fireEvent.click(within(panel).getByRole("button", { name: "Remove this condition group" }));
    expect(latest_filters.groups).toHaveLength(0);
  });

  it("loads the values of columns without a fixed list from the server", async () => {
    const loadValues = jest.fn().mockResolvedValue(["", "cloud hosting"]);
    render(<Harness loadValues={loadValues} />);
    const panel = openPanel();

    fireEvent.click(within(panel).getByRole("button", { name: "New filter" }));
    pick(panel, "Column", "Keyword");
    pick(panel, "Condition", "is");
    fireEvent.click(within(panel).getByRole("button", { name: "Keyword values" }));

    expect(await within(panel).findByRole("checkbox", { name: "cloud hosting" })).toBeInTheDocument();
    expect(within(panel).getByRole("checkbox", { name: "(Blanks)" })).toBeInTheDocument();
    expect(loadValues).toHaveBeenCalledWith("keyword", "");

    fireEvent.click(within(panel).getByRole("checkbox", { name: "(Blanks)" }));
    await waitFor(() => expect(latest_filters.rules[0].values).toEqual([""]));
  });
});
