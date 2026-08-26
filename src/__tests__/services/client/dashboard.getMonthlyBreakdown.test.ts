/**
 * Unit tests for dashboard.service.ts's getMonthlyBreakdown().
 *
 * Regression coverage for the "Order History" dashboard bug: a client with
 * two years of orders saw months with real spend rendered as empty, and a
 * June order rendered under the wrong month. Two independent defects fed
 * that bug:
 *   1. fetchAllOrders() silently truncated to the first 10 orders (covered
 *      separately in link-building.service.test.ts and the backend feature
 *      test ClientLinkBuildingOrderIndexTest).
 *   2. getMonthlyBreakdown() only ever looked at a 3-month window.
 *
 * These tests pin the current date and assert the bucketing, aggregation,
 * and defensive handling of malformed legacy-imported records.
 */

import { getMonthlyBreakdown } from "@/services/client/dashboard.service";
import type { LinkBuildingOrderSummary } from "@/types/client/link-building";

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

// Pinned so "current month" is deterministic across every assertion below.
const NOW = new Date("2026-08-25T12:00:00.000Z");

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
});

afterEach(() => {
  jest.useRealTimers();
});

describe("getMonthlyBreakdown", () => {
  it("defaults to a 6 month window when months_count is not supplied", () => {
    const result = getMonthlyBreakdown([]);

    expect(result).toHaveLength(6);
    expect(result[0].month_key).toBe("2026-08");
    expect(result[5].month_key).toBe("2026-03");
  });

  it("respects an explicit months_count", () => {
    const result = getMonthlyBreakdown([], 3);

    expect(result.map((r) => r.month_key)).toEqual([
      "2026-08",
      "2026-07",
      "2026-06",
    ]);
  });

  it("clamps months_count to a sane range instead of trusting the caller blindly", () => {
    expect(getMonthlyBreakdown([], 0)).toHaveLength(1);
    expect(getMonthlyBreakdown([], -5)).toHaveLength(1);
    expect(getMonthlyBreakdown([], 999)).toHaveLength(24);
  });

  it("buckets an order into the calendar month of its created_at", () => {
    const july_order = makeOrder({
      id: "july-order",
      created_at: "2026-07-01T00:00:00.000Z",
    });

    const result = getMonthlyBreakdown([july_order], 6);
    const july_row = result.find((r) => r.month_key === "2026-07")!;
    const august_row = result.find((r) => r.month_key === "2026-08")!;

    expect(july_row.order_count).toBe(1);
    expect(july_row.has_no_orders).toBe(false);
    expect(august_row.order_count).toBe(0);
    expect(august_row.has_no_orders).toBe(true);
  });

  it("only marks the first row (the current month) as is_current_month", () => {
    const result = getMonthlyBreakdown([], 6);

    expect(result[0].is_current_month).toBe(true);
    expect(result.slice(1).every((r) => !r.is_current_month)).toBe(true);
  });

  it("sums spend and counts orders per month independently of other months", () => {
    const orders = [
      makeOrder({ id: "a", created_at: "2026-07-05T00:00:00.000Z", total_amount: 150 }),
      makeOrder({ id: "b", created_at: "2026-07-20T00:00:00.000Z", total_amount: 200 }),
      makeOrder({ id: "c", created_at: "2026-06-10T00:00:00.000Z", total_amount: 999 }),
    ];

    const result = getMonthlyBreakdown(orders, 6);
    const july_row = result.find((r) => r.month_key === "2026-07")!;

    expect(july_row.order_count).toBe(2);
    expect(july_row.total_spend).toBe(350);
  });

  it("computes completion_rate from only the orders in that month", () => {
    const orders = [
      makeOrder({ id: "a", created_at: "2026-07-01T00:00:00.000Z", status: "completed" }),
      makeOrder({ id: "b", created_at: "2026-07-01T00:00:00.000Z", status: "processing" }),
    ];

    const result = getMonthlyBreakdown(orders, 6);
    const july_row = result.find((r) => r.month_key === "2026-07")!;

    expect(july_row.completion_rate).toBe(50);
    expect(july_row.is_complete).toBe(false);
  });

  it("marks a month complete only when it has orders and a 100% completion rate", () => {
    const all_completed = [
      makeOrder({ id: "a", created_at: "2026-07-01T00:00:00.000Z", status: "completed" }),
    ];

    const result = getMonthlyBreakdown(all_completed, 6);
    const july_row = result.find((r) => r.month_key === "2026-07")!;
    const empty_month = result.find((r) => r.month_key === "2026-06")!;

    expect(july_row.is_complete).toBe(true);
    expect(empty_month.is_complete).toBe(false);
  });

  it("excludes an order with an unparseable created_at instead of crashing or corrupting a month's totals", () => {
    const orders = [
      makeOrder({ id: "good", created_at: "2026-07-01T00:00:00.000Z", total_amount: 100 }),
      makeOrder({ id: "bad-date", created_at: "not-a-real-date", total_amount: 500 }),
    ];

    const result = getMonthlyBreakdown(orders, 6);
    const july_row = result.find((r) => r.month_key === "2026-07")!;

    expect(july_row.order_count).toBe(1);
    expect(july_row.total_spend).toBe(100);
  });

  it("excludes an order with a non-finite total_amount or items_count", () => {
    const orders = [
      makeOrder({
        id: "bad-amount",
        created_at: "2026-07-01T00:00:00.000Z",
        total_amount: Number.NaN,
      }),
      makeOrder({
        id: "bad-items",
        created_at: "2026-07-01T00:00:00.000Z",
        items_count: Number.POSITIVE_INFINITY,
      }),
    ];

    const result = getMonthlyBreakdown(orders, 6);
    const july_row = result.find((r) => r.month_key === "2026-07")!;

    expect(july_row.order_count).toBe(0);
    expect(july_row.has_no_orders).toBe(true);
  });

  it("produces a human readable month label alongside the sortable month_key", () => {
    const result = getMonthlyBreakdown([], 1);

    expect(result[0].month_key).toBe("2026-08");
    expect(result[0].month).toBe("August 2026");
  });
});
