/**
 * Tests for the "Filter" toolbar button and panel of the admin Link Building
 * Orders table, and its Quick filters view: the monday style value pills.
 */

import React, { useState } from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import LinkBuildingFilterPanel from "@/components/admin/dashboard/LinkBuildingFilterPanel";
import QuickFilterPanel from "@/components/admin/dashboard/QuickFilterPanel";
import type { QuickFilterFacet } from "@/lib/link-building-quick-filters";

function renderPanel(overrides: Partial<React.ComponentProps<typeof LinkBuildingFilterPanel>> = {}) {
  const props: React.ComponentProps<typeof LinkBuildingFilterPanel> = {
    is_open: true,
    onOpenChange: jest.fn(),
    is_advanced_mode: false,
    onModeChange: jest.fn(),
    active_filter_count: 0,
    result_count: 1,
    total_count: 400,
    is_loading: false,
    can_clear: false,
    onClearAll: jest.fn(),
    button_class: "idle",
    active_button_class: "active",
    children: <p>Panel content</p>,
    ...overrides,
  };
  render(<LinkBuildingFilterPanel {...props} />);
  return props;
}

describe("LinkBuildingFilterPanel", () => {
  it("shows the active count on the button like monday's Filter / 1", () => {
    renderPanel({ is_open: false, active_filter_count: 1 });
    const button = screen.getByRole("button", { name: "Filter, 1 active" });
    expect(button).toHaveTextContent("Filter / 1");
    expect(screen.getByRole("group", { name: "Filter" })).toHaveClass("active");
  });

  it("opens Quick filters from the button and Advanced filters from its arrow", () => {
    const props = renderPanel({ is_open: false });
    fireEvent.click(screen.getByRole("button", { name: "Filter" }));
    expect(props.onModeChange).toHaveBeenLastCalledWith(false);
    expect(props.onOpenChange).toHaveBeenLastCalledWith(true);

    fireEvent.click(screen.getByRole("button", { name: "Advanced filters" }));
    expect(props.onModeChange).toHaveBeenLastCalledWith(true);
    expect(props.onOpenChange).toHaveBeenLastCalledWith(true);
  });

  it("closes when the arrow is clicked while Advanced filters is already open", () => {
    const props = renderPanel({ is_open: true, is_advanced_mode: true });
    fireEvent.click(screen.getByRole("button", { name: "Advanced filters" }));
    expect(props.onOpenChange).toHaveBeenLastCalledWith(false);
    expect(props.onModeChange).not.toHaveBeenCalled();
  });

  it("shows how many orders match out of the total", () => {
    renderPanel();
    const dialog = screen.getByRole("dialog", { name: "Quick filters" });
    expect(within(dialog).getByText("Showing 1 of 400 orders")).toBeInTheDocument();
    expect(within(dialog).getByText("Panel content")).toBeInTheDocument();
  });

  it("says all orders are shown when nothing is filtered", () => {
    renderPanel({ result_count: 400 });
    expect(screen.getByText("Showing all of 400 orders")).toBeInTheDocument();
  });

  it("switches between quick and advanced filters", () => {
    const props = renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Switch to advanced filters" }));
    expect(props.onModeChange).toHaveBeenCalledWith(true);
  });

  it("titles the panel after the advanced mode and shows the footer note", () => {
    renderPanel({ is_advanced_mode: true, footer_note: "Quick filters and column filters are also applied." });
    expect(screen.getByRole("dialog", { name: "Advanced filters" })).toBeInTheDocument();
    expect(screen.getByText("Quick filters and column filters are also applied.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Switch to quick filters" })).toBeInTheDocument();
  });

  it("clears every filter only when there is something to clear", () => {
    const props = renderPanel({ can_clear: true });
    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    expect(props.onClearAll).toHaveBeenCalled();
  });

  it("closes on Escape and on a click outside", () => {
    const props = renderPanel({ can_clear: false });
    expect(screen.getByRole("button", { name: "Clear all" })).toBeDisabled();
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.mouseDown(document.body);
    expect(props.onOpenChange).toHaveBeenCalledTimes(2);
    expect(props.onOpenChange).toHaveBeenCalledWith(false);
  });
});

const FACETS: QuickFilterFacet[] = [
  {
    key: "status",
    label: "Status",
    selected_values: ["Live"],
    has_more: false,
    options: [
      { value: "Live", label: "Live", count: 12, dot_class: "bg-green-500" },
      { value: "Pending", label: "Pending", count: 0, dot_class: "bg-yellow-400" },
    ],
  },
  {
    key: "assigned_admin_user_id",
    label: "Assigned To",
    selected_values: [],
    has_more: false,
    options: [
      { value: "7", label: "Me", count: 3, avatar: { name: "Collin Porter", url: null } },
      { value: "0", label: "Unassigned", count: 5, avatar: { name: "", url: null } },
    ],
  },
];

describe("QuickFilterPanel", () => {
  function renderQuick({ is_loading = false }: { is_loading?: boolean } = {}) {
    const onToggle = jest.fn();
    const onClearFacet = jest.fn();
    const onQueryChange = jest.fn();
    // The table keeps the search text, this stands in for it.
    function QuickFilterPanelHost() {
      const [query, setQuery] = useState("");
      return (
        <QuickFilterPanel
          facets={FACETS}
          is_loading={is_loading}
          has_error={false}
          query={query}
          onQueryChange={(next_query) => {
            onQueryChange(next_query);
            setQuery(next_query);
          }}
          onToggle={onToggle}
          onClearFacet={onClearFacet}
        />
      );
    }
    render(<QuickFilterPanelHost />);
    return { onToggle, onClearFacet, onQueryChange };
  }

  it("lists every column with its values, counts and picked state", () => {
    renderQuick();
    const status = screen.getByRole("group", { name: "Status" });
    expect(within(status).getByRole("button", { name: /Live/ })).toHaveAttribute("aria-pressed", "true");
    expect(within(status).getByRole("button", { name: /Live/ })).toHaveTextContent("12");
    expect(within(status).getByRole("button", { name: /Pending/ })).toHaveAttribute("aria-pressed", "false");
    expect(within(screen.getByRole("group", { name: "Assigned To" })).getByText("Me")).toBeInTheDocument();
    expect(screen.getByText("CP")).toBeInTheDocument();
  });

  it("toggles a value with one click and clears a column", () => {
    const { onToggle, onClearFacet } = renderQuick();
    fireEvent.click(screen.getByRole("button", { name: /Unassigned/ }));
    expect(onToggle).toHaveBeenCalledWith("assigned_admin_user_id", "0");

    fireEvent.click(screen.getByRole("button", { name: "Clear Status" }));
    expect(onClearFacet).toHaveBeenCalledWith("status");
    // Only columns with picks offer Clear.
    expect(screen.queryByRole("button", { name: "Clear Assigned To" })).not.toBeInTheDocument();
  });

  it("narrows the values with the search box", () => {
    renderQuick();
    fireEvent.change(screen.getByLabelText("Search quick filter values"), { target: { value: "pend" } });
    expect(screen.getByRole("button", { name: /Pending/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Live/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Assigned To" })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search quick filter values"), { target: { value: "zzz" } });
    expect(screen.getByText('No values match "zzz".')).toBeInTheDocument();
  });

  it("reports the search text, and says it is searching while server values load", () => {
    const { onQueryChange } = renderQuick({ is_loading: true });
    fireEvent.change(screen.getByLabelText("Search quick filter values"), { target: { value: "zzz" } });
    expect(onQueryChange).toHaveBeenCalledWith("zzz");
    expect(screen.getByText('Searching values for "zzz"...')).toBeInTheDocument();
  });
});
