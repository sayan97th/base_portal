/**
 * Unit tests for dashboard.service.ts's completed_date handling.
 *
 * The "Completed Date" column on the client Order Status table sources its value
 * from the placement's live_link_date on the backend (see OrderPlacementsController),
 * but the API still returns it under the `completed_date` key so the frontend
 * contract stays unchanged. These tests guard against a future regression where
 * fetchPaginatedTableRows drops or renames the field while mapping status.
 */

jest.mock("@/services/client/link-building.service", () => ({
  linkBuildingService: {
    fetchMyOrderPlacements: jest.fn(),
  },
}));

import { linkBuildingService } from "@/services/client/link-building.service";
import { dashboardService, mapOrderStatus } from "@/services/client/dashboard.service";
import type { OrderPlacementRow } from "@/types/client/link-building";

const mocked_fetch = linkBuildingService.fetchMyOrderPlacements as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

const base_row: OrderPlacementRow = {
  id: "p1",
  order_id: "BL-25001",
  display_order_id: "BL-25001",
  start_date: "2026-07-01T00:00:00.000Z",
  dr_type: "DR 40+",
  keyword: "best running shoes",
  landing_page: "https://example.com/shoes",
  status: "Live",
  live_link: "https://publisher.example.com/article",
  completed_date: "07/13/2026",
  dr_lbs: "61",
  request_date: "07/01/2026",
};

describe("dashboardService.fetchPaginatedTableRows", () => {
  it("passes completed_date through unchanged while mapping status", async () => {
    mocked_fetch.mockResolvedValueOnce({
      data: [base_row],
      current_page: 1,
      last_page: 1,
      per_page: 10,
      total: 1,
    });

    const result = await dashboardService.fetchPaginatedTableRows();

    expect(result.data[0].completed_date).toBe("07/13/2026");
    expect(result.data[0].status).toBe("Live");
  });

  it("preserves an empty completed_date instead of substituting a placeholder", async () => {
    mocked_fetch.mockResolvedValueOnce({
      data: [{ ...base_row, completed_date: "" }],
      current_page: 1,
      last_page: 1,
      per_page: 10,
      total: 1,
    });

    const result = await dashboardService.fetchPaginatedTableRows();

    expect(result.data[0].completed_date).toBe("");
  });

  it("forwards filters (including sort_by=completed_date) to the API layer unchanged", async () => {
    mocked_fetch.mockResolvedValueOnce({
      data: [],
      current_page: 1,
      last_page: 1,
      per_page: 10,
      total: 0,
    });

    await dashboardService.fetchPaginatedTableRows({
      sort_by: "completed_date",
      sort_direction: "desc",
    });

    expect(mocked_fetch).toHaveBeenCalledWith({
      sort_by: "completed_date",
      sort_direction: "desc",
    });
  });
});

/**
 * Regression coverage for a bug this uncovered: the admin Link Building Orders
 * dashboard now lets a placement's status be free text (e.g. pasted from the
 * external BASE sheet) instead of only the fixed preset list. mapOrderStatus
 * used to silently relabel any status it didn't recognize as "New request" —
 * so a client viewing their dashboard would see the wrong status for a
 * placement the admin had genuinely moved into some other, non-preset state.
 * It must now show that free-text status verbatim instead.
 */
describe("mapOrderStatus", () => {
  it("maps a known order-level status to its display label", () => {
    expect(mapOrderStatus("completed")).toBe("Live");
    expect(mapOrderStatus("cancelled")).toBe("Cancelled");
  });

  it("maps a known admin placement status to its display label", () => {
    expect(mapOrderStatus("Reviewing")).toBe("Reviewing");
    expect(mapOrderStatus("Quality Control")).toBe("Quality Control");
  });

  it("returns a free-text status verbatim instead of mislabeling it as 'New request'", () => {
    expect(mapOrderStatus("Needs Client Approval XYZ")).toBe("Needs Client Approval XYZ");
  });

  it("returns a differently-cased known status verbatim, since matching is case-sensitive", () => {
    // "reviewing" (lowercase) does not match the "Reviewing" key in either map,
    // so it falls through to the same free-text passthrough as any other
    // unrecognized value.
    expect(mapOrderStatus("reviewing")).toBe("reviewing");
  });

  it("passes a free-text status through fetchPaginatedTableRows unchanged", async () => {
    mocked_fetch.mockResolvedValueOnce({
      data: [{ ...base_row, status: "Needs Client Approval XYZ" as OrderPlacementRow["status"] }],
      current_page: 1,
      last_page: 1,
      per_page: 10,
      total: 1,
    });

    const result = await dashboardService.fetchPaginatedTableRows();

    expect(result.data[0].status).toBe("Needs Client Approval XYZ");
  });
});
