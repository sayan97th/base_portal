/**
 * Tests for the Link Building Orders history service: the restore conflict
 * answer (HTTP 409) comes back as a result to act on, not as an error.
 */

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

import { apiClient } from "@/lib/api-client";
import {
  listLinkBuildingOrderHistory,
  restoreLinkBuildingOrderHistory,
} from "@/services/admin/link-building-order-history.service";

const mocked = apiClient as jest.Mocked<typeof apiClient>;

beforeEach(() => jest.clearAllMocks());

it("sends the history filters as query parameters", async () => {
  mocked.get.mockResolvedValue({ data: [], meta: {} });

  await listLinkBuildingOrderHistory({ page: 2, source: "paste", order_id: " BL-257 " });

  expect(mocked.get).toHaveBeenCalledWith("/api/admin/link-building-orders/history?page=2&per_page=20&source=paste&order_id=BL-257");
});

it("posts the restore target with its conflict strategy", async () => {
  mocked.post.mockResolvedValue({ applied: true });

  await restoreLinkBuildingOrderHistory({ batch_id: "b1" }, "skip");

  expect(mocked.post).toHaveBeenCalledWith("/api/admin/link-building-orders/history/restore", {
    batch_id: "b1",
    conflict_strategy: "skip",
  });
});

it("returns the conflicts of a 409 answer instead of throwing", async () => {
  const conflict = {
    placement_id: "p1", order_id: "BL-1", field: "keyword",
    current_value: "now", expected_value: "pasted", restore_value: "before",
  };
  mocked.post.mockRejectedValue({ status_code: 409, message: "1 cell(s) were edited again.", conflicts: [conflict], skipped: [] });

  const result = await restoreLinkBuildingOrderHistory({ batch_id: "b1" });

  expect(result.applied).toBe(false);
  expect(result.conflicts).toEqual([conflict]);
});

it("still throws other errors", async () => {
  mocked.post.mockRejectedValue({ status_code: 404, message: "Change not found in the history." });

  await expect(restoreLinkBuildingOrderHistory({ revision_id: 9 })).rejects.toMatchObject({ status_code: 404 });
});
