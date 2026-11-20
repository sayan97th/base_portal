import type { Coupon } from "@/types/admin/coupons";
import {
  countExpiringSoon,
  getCouponStatus,
  sumRedemptions,
} from "@/components/admin/coupons/list/coupon-list";

const NOW = new Date("2026-11-20T12:00:00Z");

function buildCoupon(overrides: Partial<Coupon> = {}): Coupon {
  return {
    id: "coupon-1",
    code: "SAVE10",
    name: "Save 10",
    description: null,
    discount_type: "percentage",
    discount_value: 10,
    applies_to: "all",
    product_types: [],
    dr_tier_ids: [],
    dr_tiers: [],
    minimum_purchase_amount: null,
    starts_at: null,
    expires_at: null,
    usage_limit: null,
    usage_per_user: null,
    times_used: 0,
    is_active: true,
    created_at: "2026-11-01T00:00:00Z",
    updated_at: "2026-11-01T00:00:00Z",
    ...overrides,
  };
}

describe("coupon list helpers", () => {
  it("resolves the status from the active flag and the dates", () => {
    expect(getCouponStatus(buildCoupon({ is_active: false }), NOW)).toBe("disabled");
    expect(getCouponStatus(buildCoupon({ expires_at: "2026-11-01T00:00:00Z" }), NOW)).toBe("expired");
    expect(getCouponStatus(buildCoupon({ starts_at: "2026-12-01T00:00:00Z" }), NOW)).toBe("scheduled");
    expect(getCouponStatus(buildCoupon(), NOW)).toBe("active");
  });

  it("counts only active coupons that end within the window", () => {
    const coupons = [
      buildCoupon({ id: "a", expires_at: "2026-11-23T12:00:00Z" }),
      buildCoupon({ id: "b", expires_at: "2026-12-30T12:00:00Z" }),
      buildCoupon({ id: "c", expires_at: null }),
      buildCoupon({ id: "d", expires_at: "2026-11-22T12:00:00Z", is_active: false }),
      buildCoupon({ id: "e", expires_at: "2026-11-10T12:00:00Z" }),
    ];
    expect(countExpiringSoon(coupons, 7, NOW)).toBe(1);
  });

  it("adds up every redemption", () => {
    const coupons = [buildCoupon({ times_used: 3 }), buildCoupon({ times_used: 12 })];
    expect(sumRedemptions(coupons)).toBe(15);
    expect(sumRedemptions([])).toBe(0);
  });
});
