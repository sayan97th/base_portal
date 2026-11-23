/**
 * Unit tests for the admin coupons service (src/services/admin/coupons.service.ts).
 *
 * The quick enable or disable must go through the dedicated status endpoint,
 * which only validates is_active. If it went back to the generic PATCH, a
 * coupon with stored data that fails the full edit validation could not be
 * switched off during an incident.
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
  addDrTiersToCoupon,
  createAdminCoupon,
  deleteAdminCoupon,
  getAdminCoupon,
  listAdminCoupons,
  removeDrTierFromCoupon,
  toggleAdminCouponStatus,
  updateAdminCoupon,
} from "@/services/admin/coupons.service";
import type { Coupon, CreateCouponPayload } from "@/types/admin/coupons";

const mock_get = apiClient.get as jest.Mock;
const mock_post = apiClient.post as jest.Mock;
const mock_patch = apiClient.patch as jest.Mock;
const mock_delete = apiClient.delete as jest.Mock;

function makeCoupon(overrides: Partial<Coupon> = {}): Coupon {
  return {
    id: "coupon-1",
    code: "TESTLAUNCH100",
    name: "Test Launch Special",
    description: null,
    discount_type: "fixed_amount",
    discount_value: 100,
    applies_to: "minimum_purchase",
    product_types: [],
    dr_tier_ids: [],
    dr_tiers: [],
    minimum_purchase_amount: 800,
    max_discount_amount: null,
    starts_at: null,
    expires_at: null,
    usage_limit: 50,
    usage_per_user: null,
    times_used: 0,
    is_active: true,
    created_at: "2026-11-01T00:00:00+00:00",
    updated_at: "2026-11-01T00:00:00+00:00",
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("toggleAdminCouponStatus", () => {
  it("PATCHes the dedicated status endpoint with only is_active", async () => {
    mock_patch.mockResolvedValueOnce({ data: makeCoupon({ is_active: false }) });

    const result = await toggleAdminCouponStatus("coupon-1", false);

    expect(mock_patch).toHaveBeenCalledTimes(1);
    expect(mock_patch).toHaveBeenCalledWith("/api/admin/coupons/coupon-1/status", { is_active: false });
    expect(result.is_active).toBe(false);
  });

  it("can enable a coupon again", async () => {
    mock_patch.mockResolvedValueOnce({ data: makeCoupon({ is_active: true }) });

    await toggleAdminCouponStatus("coupon-1", true);

    expect(mock_patch).toHaveBeenCalledWith("/api/admin/coupons/coupon-1/status", { is_active: true });
  });

  it("propagates API errors so the caller can roll back", async () => {
    mock_patch.mockRejectedValueOnce({ message: "Server error" });

    await expect(toggleAdminCouponStatus("coupon-1", false)).rejects.toEqual({ message: "Server error" });
  });
});

describe("coupon CRUD", () => {
  it("lists coupons and unwraps data", async () => {
    mock_get.mockResolvedValueOnce({ data: [makeCoupon()] });

    const result = await listAdminCoupons();

    expect(mock_get).toHaveBeenCalledWith("/api/admin/coupons");
    expect(result).toHaveLength(1);
  });

  it("gets a single coupon", async () => {
    mock_get.mockResolvedValueOnce({ data: makeCoupon() });

    const result = await getAdminCoupon("coupon-1");

    expect(mock_get).toHaveBeenCalledWith("/api/admin/coupons/coupon-1");
    expect(result.code).toBe("TESTLAUNCH100");
  });

  it("creates a coupon with POST", async () => {
    const payload: CreateCouponPayload = {
      code: "SAVE10",
      name: "Save 10",
      discount_type: "percentage",
      discount_value: 10,
      applies_to: "all",
      dr_tier_ids: [],
      expires_at: null,
      is_active: true,
    };
    mock_post.mockResolvedValueOnce({ data: makeCoupon({ code: "SAVE10" }) });

    await createAdminCoupon(payload);

    expect(mock_post).toHaveBeenCalledWith("/api/admin/coupons", payload);
  });

  it("updates a coupon with PATCH on the coupon url, not the status url", async () => {
    mock_patch.mockResolvedValueOnce({ data: makeCoupon() });

    await updateAdminCoupon("coupon-1", { name: "Renamed" });

    expect(mock_patch).toHaveBeenCalledWith("/api/admin/coupons/coupon-1", { name: "Renamed" });
  });

  it("deletes a coupon", async () => {
    mock_delete.mockResolvedValueOnce(undefined);

    await deleteAdminCoupon("coupon-1");

    expect(mock_delete).toHaveBeenCalledWith("/api/admin/coupons/coupon-1");
  });
});

describe("DR tier helpers", () => {
  it("merges new tiers with the existing ones without duplicates", async () => {
    mock_patch.mockResolvedValueOnce({ data: makeCoupon() });

    await addDrTiersToCoupon(makeCoupon({ dr_tier_ids: ["dr40", "dr50"] }), ["dr50", "dr60"]);

    expect(mock_patch).toHaveBeenCalledWith("/api/admin/coupons/coupon-1", {
      dr_tier_ids: ["dr40", "dr50", "dr60"],
    });
  });

  it("removes a single tier", async () => {
    mock_patch.mockResolvedValueOnce({ data: makeCoupon() });

    await removeDrTierFromCoupon(makeCoupon({ dr_tier_ids: ["dr40", "dr50"] }), "dr40");

    expect(mock_patch).toHaveBeenCalledWith("/api/admin/coupons/coupon-1", { dr_tier_ids: ["dr50"] });
  });
});
