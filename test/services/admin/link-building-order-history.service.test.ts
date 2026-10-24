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

it("sends the history filters and the cursor as query parameters", async () => {
  mocked.get.mockResolvedValue({ data: [], meta: {} });

  await listLinkBuildingOrderHistory({ before_id: 40, source: "paste", order_id: " BL-257 " });

  expect(mocked.get).toHaveBeenCalledWith("/api/admin/link-building-orders/history?per_page=20&before_id=40&source=paste&order_id=BL-257");
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

it("waits for a large restore running in the background and returns its result", async () => {
  jest.useFakeTimers();
  const result = { applied: true, message: "Restored 30,000 cell(s).", reload_required: true };
  mocked.post.mockResolvedValue({ queued: true, restore_id: "r1", message: "Queued" });
  mocked.get
    .mockResolvedValueOnce({ status: "processing" })
    .mockResolvedValueOnce({ status: "completed", result });
  const onQueued = jest.fn();

  const promise = restoreLinkBuildingOrderHistory({ batch_id: "import-1" }, "abort", onQueued);
  await jest.advanceTimersByTimeAsync(2000);
  await jest.advanceTimersByTimeAsync(2000);

  await expect(promise).resolves.toEqual(result);
  expect(onQueued).toHaveBeenCalled();
  expect(mocked.get).toHaveBeenCalledWith("/api/admin/link-building-orders/history/restores/r1");
  jest.useRealTimers();
});

it("throws when the background restore fails", async () => {
  jest.useFakeTimers();
  mocked.post.mockResolvedValue({ queued: true, restore_id: "r2", message: "Queued" });
  mocked.get.mockResolvedValueOnce({ status: "failed", message: "The restore could not be completed." });

  const promise = restoreLinkBuildingOrderHistory({ batch_id: "import-1" });
  const assertion = expect(promise).rejects.toMatchObject({ message: "The restore could not be completed." });
  await jest.advanceTimersByTimeAsync(2000);

  await assertion;
  jest.useRealTimers();
});
