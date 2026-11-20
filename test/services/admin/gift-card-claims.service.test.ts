jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

import { apiClient } from "@/lib/api-client";
import {
  listAdminGiftCardClaims,
  updateAdminGiftCardClaimFulfillment,
} from "@/services/admin/gift-card-claims.service";

const mocked = apiClient as jest.Mocked<typeof apiClient>;

describe("admin gift card claims service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocked.get.mockResolvedValue({ data: [] });
  });

  it("lists every claim without filters", async () => {
    await listAdminGiftCardClaims();

    expect(mocked.get).toHaveBeenCalledWith("/api/admin/gift-card-claims");
  });

  it("only sends the filters that have a value", async () => {
    await listAdminGiftCardClaims({ coupon_id: "coupon-1", order_id: undefined, status: "submitted" });

    expect(mocked.get).toHaveBeenCalledWith("/api/admin/gift-card-claims?coupon_id=coupon-1&status=submitted");
  });

  it("marks a gift card as sent and as not sent", async () => {
    mocked.patch.mockResolvedValue({ data: { id: "claim-1" } });

    await updateAdminGiftCardClaimFulfillment("claim-1", true);
    await updateAdminGiftCardClaimFulfillment("claim-1", false);

    expect(mocked.patch).toHaveBeenNthCalledWith(1, "/api/admin/gift-card-claims/claim-1/fulfillment", { is_fulfilled: true });
    expect(mocked.patch).toHaveBeenNthCalledWith(2, "/api/admin/gift-card-claims/claim-1/fulfillment", { is_fulfilled: false });
  });
});
