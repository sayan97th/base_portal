/**
 * Unit tests for the admin order service.
 *
 * These verify each function targets the correct endpoint and forwards
 * parameters/ids verbatim to the shared apiClient.
 */

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

import { apiClient } from "@/lib/api-client";
import {
  getAdminOrder,
  listAdminOrders,
  deleteAdminOrder,
} from "@/services/admin/order.service";

const mocked = apiClient as jest.Mocked<typeof apiClient>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("getAdminOrder", () => {
  it("requests the single-order endpoint by id", async () => {
    mocked.get.mockResolvedValueOnce({ id: "order-1" } as never);

    await getAdminOrder("order-1");

    expect(mocked.get).toHaveBeenCalledWith("/api/admin/orders/order-1");
  });
});

describe("listAdminOrders", () => {
  it("requests the orders collection endpoint with default pagination", async () => {
    mocked.get.mockResolvedValueOnce({ data: [], current_page: 1, last_page: 1, per_page: 15, total: 0 } as never);

    await listAdminOrders();

    const [url] = mocked.get.mock.calls[0];
    expect(url).toContain("/api/admin/orders?");
    expect(url).toContain("page=1");
    expect(url).toContain("per_page=15");
  });

  it("forwards the session_id filter when provided", async () => {
    mocked.get.mockResolvedValueOnce({ data: [], current_page: 1, last_page: 1, per_page: 15, total: 0 } as never);

    await listAdminOrders({ session_id: "session-1" });

    const [url] = mocked.get.mock.calls[0];
    expect(url).toContain("session_id=session-1");
  });
});

describe("deleteAdminOrder", () => {
  it("DELETEs the order endpoint for the given id", async () => {
    mocked.delete.mockResolvedValueOnce(undefined as never);

    await deleteAdminOrder("order-1");

    expect(mocked.delete).toHaveBeenCalledWith("/api/admin/orders/order-1");
  });

  it("propagates errors thrown by the api client", async () => {
    mocked.delete.mockRejectedValueOnce({ message: "Order not found." });

    await expect(deleteAdminOrder("missing-order")).rejects.toMatchObject({
      message: "Order not found.",
    });
  });
});
