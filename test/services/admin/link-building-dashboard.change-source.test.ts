/**
 * The dashboard batch updates tell the API what kind of change they are (a paste,
 * an undo, a fill...), which is how the version history names each action.
 */

jest.mock("@/lib/api-client", () => ({
  apiClient: { post: jest.fn() },
  getToken: jest.fn(),
}));

import { apiClient } from "@/lib/api-client";
import {
  batchUpdateLinkBuildingOrderCells,
  batchUpdateLinkBuildingOrders,
} from "@/services/admin/link-building-dashboard.service";

const mocked = apiClient as jest.Mocked<typeof apiClient>;

beforeEach(() => {
  jest.clearAllMocks();
  mocked.post.mockResolvedValue({ message: "ok", updated_count: 1, data: [] });
});

it("sends the change source with a cell update", async () => {
  await batchUpdateLinkBuildingOrderCells([{ id: "uuid-1", fields: { keyword: "seo" } }], "undo");

  expect(mocked.post).toHaveBeenCalledWith("/api/admin/link-building-orders/batch-update-cells", {
    updates: [{ id: "uuid-1", fields: { keyword: "seo" } }],
    change_source: "undo",
  });
});

it("leaves the source to the API default when none is given", async () => {
  await batchUpdateLinkBuildingOrderCells([{ id: "uuid-1", fields: {} }]);

  expect(mocked.post).toHaveBeenCalledWith("/api/admin/link-building-orders/batch-update-cells", {
    updates: [{ id: "uuid-1", fields: {} }],
    change_source: undefined,
  });
});

it("sends the change source with a fill over many rows", async () => {
  await batchUpdateLinkBuildingOrders(["uuid-1", "uuid-2"], { pen_name: "Ana" }, "paste");

  expect(mocked.post).toHaveBeenCalledWith("/api/admin/link-building-orders/batch-update", {
    row_ids: ["uuid-1", "uuid-2"],
    updates: { pen_name: "Ana" },
    change_source: "paste",
  });
});
