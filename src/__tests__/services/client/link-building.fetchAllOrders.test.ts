/**
 * Unit tests for linkBuildingService.fetchAllOrders().
 *
 * Regression coverage for the "Order History" dashboard bug: this function
 * used to call GET /api/link-building/orders with no page/per_page, which
 * silently truncated to the endpoint's default per_page of 10 and made any
 * order older than the 10 most recent disappear from the dashboard.
 *
 * It was briefly fixed by looping through every page of the client's order
 * history, but that risked issuing many sequential requests for an account
 * with a long history. The current implementation makes exactly one bounded
 * request instead, which these tests lock down.
 */

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get:    jest.fn(),
    post:   jest.fn(),
    put:    jest.fn(),
    delete: jest.fn(),
  },
  getToken: jest.fn(() => null),
}));

import { apiClient } from "@/lib/api-client";
import { linkBuildingService } from "@/services/client/link-building.service";
import type { LinkBuildingOrderSummary } from "@/types/client/link-building";

const mocked_get = apiClient.get as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

function makeOrder(id: string): LinkBuildingOrderSummary {
  return {
    id,
    order_title: null,
    total_amount: 100,
    status: "completed",
    created_at: "2026-07-01T00:00:00.000Z",
    items_count: 1,
    updates_count: 0,
    last_update_at: null,
  };
}

describe("linkBuildingService.fetchAllOrders", () => {
  it("makes exactly one request instead of paginating through the client's full history", async () => {
    mocked_get.mockResolvedValueOnce({
      data: [makeOrder("a"), makeOrder("b")],
      current_page: 1,
      last_page: 1,
      per_page: 100,
      total: 2,
    });

    const result = await linkBuildingService.fetchAllOrders();

    expect(mocked_get).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(2);
  });

  it("requests a bounded per_page instead of relying on the endpoint's default of 10", async () => {
    mocked_get.mockResolvedValueOnce({
      data: [],
      current_page: 1,
      last_page: 1,
      per_page: 100,
      total: 0,
    });

    await linkBuildingService.fetchAllOrders();

    const [requested_url] = mocked_get.mock.calls[0];
    const params = new URLSearchParams(requested_url.split("?")[1]);

    expect(params.get("page")).toBe("1");
    expect(Number(params.get("per_page"))).toBeGreaterThan(10);
  });

  it("does not issue a second request even when the server reports more pages remain", async () => {
    // Guards against a regression back to the multi-page loop this function
    // used to have: even if last_page > 1, fetchAllOrders must still resolve
    // after a single request rather than fetching subsequent pages.
    mocked_get.mockResolvedValueOnce({
      data: [makeOrder("a")],
      current_page: 1,
      last_page: 5,
      per_page: 100,
      total: 500,
    });

    const result = await linkBuildingService.fetchAllOrders();

    expect(mocked_get).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
  });

  it("returns an empty array when the account has no orders", async () => {
    mocked_get.mockResolvedValueOnce({
      data: [],
      current_page: 1,
      last_page: 1,
      per_page: 100,
      total: 0,
    });

    const result = await linkBuildingService.fetchAllOrders();

    expect(result).toEqual([]);
  });
});
