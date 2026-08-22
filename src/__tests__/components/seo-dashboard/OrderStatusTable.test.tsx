/**
 * Tests for the client "Order Status" table's Completed Date column.
 *
 * Regression coverage for the bug where clients never saw a completed date on
 * their orders: the column header still reads "Completed Date", but the value
 * rendered underneath now comes from the placement's live_link_date (aliased
 * as completed_date by the backend — see OrderPlacementsController). These
 * tests only care about what OrderStatusTable does with row.completed_date,
 * not where the backend sourced it from.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import OrderStatusTable from "@/components/seo-dashboard/OrderStatusTable";
import type { DashboardTableRow } from "@/services/client/dashboard.service";

jest.mock("next/link", () => {
  const Link = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  Link.displayName = "Link";
  return Link;
});

jest.mock("flatpickr", () => jest.fn(() => ({ destroy: jest.fn(), setDate: jest.fn(), clear: jest.fn() })));

function makeRow(overrides: Partial<DashboardTableRow> = {}): DashboardTableRow {
  return {
    id: "p1",
    order_id: "BL-25001",
    display_order_id: "BL-25001",
    start_date: "2026-07-01T00:00:00.000Z",
    dr_type: "DR 40+",
    keyword: "best running shoes",
    landing_page: "https://example.com/shoes",
    status: "Live",
    live_link: "https://publisher.example.com/article",
    completed_date: "",
    dr_lbs: "61",
    request_date: "2026-07-01",
    source: "purchased",
    ...overrides,
  };
}

const noop = () => {};

function renderTable(rows: DashboardTableRow[]) {
  return render(
    <OrderStatusTable
      rows={rows}
      is_loading={false}
      current_page={1}
      last_page={1}
      total={rows.length}
      per_page={10}
      search_term=""
      onSearchChange={noop}
      onPageChange={noop}
      onExport={noop}
      filters={{}}
      onFiltersChange={noop}
      onSortChange={noop}
    />
  );
}

describe("OrderStatusTable — Completed Date column", () => {
  it("keeps the column header labeled 'Completed Date'", () => {
    renderTable([makeRow()]);

    expect(screen.getByRole("button", { name: /Completed Date/i })).toBeInTheDocument();
  });

  it("renders the live-link-date-sourced value under the Completed Date header", () => {
    // 07/13/2026 mirrors what the backend now returns for completed_date,
    // sourced from the placement's live_link_date (MM/DD/YYYY string).
    renderTable([makeRow({ completed_date: "07/13/2026" })]);

    expect(screen.getByText("July 13, 2026")).toBeInTheDocument();
  });

  it("shows a placeholder dash when the placement has no live link date yet", () => {
    renderTable([makeRow({ completed_date: "" })]);

    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThan(0);
  });

  it("renders a distinct completed date per row", () => {
    renderTable([
      makeRow({ id: "p1", order_id: "BL-25001", completed_date: "07/13/2026" }),
      makeRow({ id: "p2", order_id: "BL-25002", completed_date: "01/05/2026" }),
    ]);

    expect(screen.getByText("July 13, 2026")).toBeInTheDocument();
    expect(screen.getByText("January 5, 2026")).toBeInTheDocument();
  });

  it("sorts by the completed_date key when the column header is clicked", () => {
    const onSortChange = jest.fn();

    render(
      <OrderStatusTable
        rows={[makeRow({ completed_date: "07/13/2026" })]}
        is_loading={false}
        current_page={1}
        last_page={1}
        total={1}
        per_page={10}
        search_term=""
        onSearchChange={noop}
        onPageChange={noop}
        onExport={noop}
        filters={{}}
        onFiltersChange={noop}
        onSortChange={onSortChange}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Completed Date/i }));

    expect(onSortChange).toHaveBeenCalledWith("completed_date", "asc");
  });
});
