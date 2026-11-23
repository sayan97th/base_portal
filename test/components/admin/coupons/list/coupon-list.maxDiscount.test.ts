/**
 * formatMaxDiscount (src/components/admin/coupons/list/coupon-list.ts): the
 * per order limit shown under the discount on the admin coupons list.
 */

import { formatMaxDiscount } from "@/components/admin/coupons/list/coupon-list";

describe("formatMaxDiscount", () => {
  it("describes the HAPPYHOLIDAYS gift card limit", () => {
    expect(formatMaxDiscount({ discount_type: "gift_card_reward", max_discount_amount: 1000 })).toBe(
      "Up to $1,000 per order"
    );
  });

  it("describes the limit of a percentage coupon", () => {
    expect(formatMaxDiscount({ discount_type: "percentage", max_discount_amount: 300 })).toBe("Max $300 per order");
  });

  it("keeps cents only when the limit has them", () => {
    expect(formatMaxDiscount({ discount_type: "percentage", max_discount_amount: 250.5 })).toBe(
      "Max $250.50 per order"
    );
    expect(formatMaxDiscount({ discount_type: "gift_card_reward", max_discount_amount: 25000 })).toBe(
      "Up to $25,000 per order"
    );
  });

  it("returns null without a limit", () => {
    expect(formatMaxDiscount({ discount_type: "gift_card_reward", max_discount_amount: null })).toBeNull();
    expect(formatMaxDiscount({ discount_type: "percentage", max_discount_amount: 0 })).toBeNull();
    expect(formatMaxDiscount({ discount_type: "percentage", max_discount_amount: -10 })).toBeNull();
  });

  it("returns null for fixed amount coupons even with a stored limit", () => {
    expect(formatMaxDiscount({ discount_type: "fixed_amount", max_discount_amount: 100 })).toBeNull();
  });
});
