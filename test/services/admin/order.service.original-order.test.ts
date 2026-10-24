/**
 * Tests for loading the read only "Original Order" copy of a Link Building order.
 */

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn() },
}));

import { apiClient } from "@/lib/api-client";
import { getAdminOriginalOrder } from "@/services/admin/order.service";

const mocked = apiClient as jest.Mocked<typeof apiClient>;

it("loads the original order of the given order and unwraps it", async () => {
  const details = { order: { id: "order-1" }, snapshots: [], current_placements: {}, invoice: null };
  mocked.get.mockResolvedValue({ data: details });

  await expect(getAdminOriginalOrder("order-1")).resolves.toEqual(details);
  expect(mocked.get).toHaveBeenCalledWith("/api/admin/orders/order-1/original");
});

it("lets a missing order fail so the page can explain it", async () => {
  mocked.get.mockRejectedValue({ status_code: 404 });

  await expect(getAdminOriginalOrder("other")).rejects.toMatchObject({ status_code: 404 });
});
