/**
 * Tests for the client dashboard's "Order History" widget.
 *
 * Regression coverage for the bug where a client with two years of orders
 * saw the widget as effectively empty: it only ever requested a 3 month
 * window, and the orders array feeding it had already been silently
 * truncated to 10 records upstream. This suite locks down that the widget
 * always renders a fixed 6 month window, correctly reflects the orders it
 * is given for each month, and only offers the "Start Order" CTA on the
 * current month when that month has no orders yet.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import OrderHistory from "@/components/seo-dashboard/OrderHistory";
import type { LinkBuildingOrderSummary } from "@/types/client/link-building";

jest.mock("next/link", () => {
  const Link = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  Link.displayName = "Link";
  return Link;
});

// Pinned so "current month" (August 2026) is deterministic.
const NOW = new Date("2026-08-25T12:00:00.000Z");

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
});

afterEach(() => {
  jest.useRealTimers();
});

function makeOrder(
  overrides: Partial<LinkBuildingOrderSummary> = {}
): LinkBuildingOrderSummary {
  return {
    id: "order-1",
    order_title: "Test order",
    total_amount: 100,
    status: "completed",
    created_at: "2026-08-01T00:00:00.000Z",
    items_count: 1,
    updates_count: 0,
    last_update_at: null,
    ...overrides,
  };
}

describe("OrderHistory", () => {
  it("always renders a fixed 6 month window regardless of order history length", () => {
    render(<OrderHistory orders={[]} is_loading={false} />);

    expect(screen.getByText("August 2026")).toBeInTheDocument();
    expect(screen.getByText("March 2026")).toBeInTheDocument();
    // Only 6 months should ever be rendered.
    expect(screen.queryByText("February 2026")).not.toBeInTheDocument();
  });

  it("shows skeleton rows while loading instead of the monthly breakdown", () => {
    const { container } = render(
      <OrderHistory orders={[]} is_loading={true} />
    );

    expect(screen.queryByText("August 2026")).not.toBeInTheDocument();
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("shows order count and spend for a month that has orders", () => {
    const orders = [
      makeOrder({ id: "a", created_at: "2026-07-05T12:00:00.000Z", total_amount: 150 }),
      makeOrder({ id: "b", created_at: "2026-07-20T12:00:00.000Z", total_amount: 200 }),
    ];

    render(<OrderHistory orders={orders} is_loading={false} />);

    expect(screen.getByText("2 Orders")).toBeInTheDocument();
    expect(screen.getByText("$350")).toBeInTheDocument();
  });

  it("offers the Start Order CTA only for the current month when it has no orders", () => {
    render(<OrderHistory orders={[]} is_loading={false} />);

    const start_order_links = screen.getAllByText("Start Order");
    expect(start_order_links).toHaveLength(1);
    expect(start_order_links[0].closest("a")).toHaveAttribute(
      "href",
      "/link-building"
    );
  });

  it("does not offer the Start Order CTA for an empty past month", () => {
    // With no orders at all, every month except the current one (August) is
    // empty. None of those past-empty months should show the CTA.
    render(<OrderHistory orders={[]} is_loading={false} />);

    const july_row = screen.getByText("July 2026").closest("div.grid")!;
    expect(july_row).not.toHaveTextContent("Start Order");
  });

  it("links View All to the full orders page", () => {
    render(<OrderHistory orders={[]} is_loading={false} />);

    expect(screen.getByText("View All").closest("a")).toHaveAttribute(
      "href",
      "/orders"
    );
  });
});
