import type { Coupon } from "@/types/admin/coupons";
import {
  daysUntil,
  formatShortDate,
  getCouponStatus,
  parseCouponDate,
} from "@/components/admin/coupons/list/coupon-list";
import { getCouponStateBadge } from "@/components/admin/coupons/usage/coupon-usage";

// Coupon dates from the API are calendar days (Y-m-d) and both days are included.
// HAPPYHOLIDAYS runs November 27 through December 18, 2026.

function buildHolidayPromo(overrides: Partial<Coupon> = {}): Coupon {
  return {
    id: "coupon-holiday",
    code: "HAPPYHOLIDAYS",
    name: "Happy Holidays 10% Back",
    description: null,
    discount_type: "gift_card_reward",
    discount_value: 10,
    applies_to: "all",
    product_types: [],
    dr_tier_ids: [],
    dr_tiers: [],
    minimum_purchase_amount: null,
    max_discount_amount: null,
    starts_at: "2026-11-27",
    expires_at: "2026-12-18",
    usage_limit: null,
    usage_per_user: null,
    times_used: 0,
    is_active: true,
    created_at: "2026-11-01T00:00:00Z",
    updated_at: "2026-11-01T00:00:00Z",
    ...overrides,
  };
}

describe("coupon calendar dates", () => {
  it("parses a calendar date as a local day, not as UTC midnight", () => {
    const start = parseCouponDate("2026-12-18");
    const end = parseCouponDate("2026-12-18", "end");

    expect([start.getFullYear(), start.getMonth(), start.getDate(), start.getHours()]).toEqual([2026, 11, 18, 0]);
    expect([end.getDate(), end.getHours(), end.getMinutes()]).toEqual([18, 23, 59]);
  });

  it("keeps full timestamps as exact moments", () => {
    expect(parseCouponDate("2026-12-19T06:59:59+00:00").toISOString()).toBe("2026-12-19T06:59:59.000Z");
  });

  it("shows the calendar day the admin picked", () => {
    expect(formatShortDate("2026-12-18")).toBe("Dec 18, 2026");
    expect(formatShortDate("2026-11-27")).toBe("Nov 27, 2026");
  });

  it("treats the promo as scheduled before November 27 and active on it", () => {
    const promo = buildHolidayPromo();

    expect(getCouponStatus(promo, new Date(2026, 10, 26, 23, 59))).toBe("scheduled");
    expect(getCouponStatus(promo, new Date(2026, 10, 27, 0, 0))).toBe("active");
  });

  it("keeps the promo active for the whole of December 18", () => {
    const promo = buildHolidayPromo();

    expect(getCouponStatus(promo, new Date(2026, 11, 18, 23, 59))).toBe("active");
    expect(getCouponStatus(promo, new Date(2026, 11, 19, 0, 1))).toBe("expired");
  });

  it("prefers the exact moments sent by the API", () => {
    const promo = buildHolidayPromo({
      active_from: "2026-11-27T07:00:00+00:00",
      active_until: "2026-12-19T06:59:59+00:00",
    });

    expect(getCouponStatus(promo, new Date("2026-11-27T06:59:00Z"))).toBe("scheduled");
    expect(getCouponStatus(promo, new Date("2026-12-19T06:00:00Z"))).toBe("active");
    expect(getCouponStatus(promo, new Date("2026-12-19T07:00:00Z"))).toBe("expired");
  });

  it("counts the last day as a remaining day", () => {
    expect(daysUntil("2026-12-18", new Date(2026, 11, 18, 9, 0))).toBe(1);
    expect(daysUntil("2026-12-18", new Date(2026, 11, 16, 9, 0))).toBe(3);
  });

  it("uses the same status for the coupon header badges", () => {
    expect(getCouponStateBadge(buildHolidayPromo(), new Date(2026, 11, 18, 12, 0)).label).toBe("Active");
    expect(getCouponStateBadge(buildHolidayPromo(), new Date(2026, 11, 20, 12, 0)).label).toBe("Expired");
    expect(getCouponStateBadge(buildHolidayPromo({ is_active: false }), new Date(2026, 11, 1)).label).toBe("Disabled");
  });
});
