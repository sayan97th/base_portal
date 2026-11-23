/**
 * Coupon limit helpers shared by the cart and the gift card screens. They
 * mirror Coupon::applyMaxDiscount in the API so the estimate shown at
 * checkout matches the gift card the client receives.
 */

import {
  applyMaxDiscountAmount,
  formatRewardLimit,
  normalizeMaxDiscountAmount,
} from "@/types/client/gift-card-rewards";

describe("applyMaxDiscountAmount", () => {
  it("caps the HAPPYHOLIDAYS gift card at $1,000 however big the order is", () => {
    expect(applyMaxDiscountAmount(20000 * 0.1, 1000)).toBe(1000);
    expect(applyMaxDiscountAmount(50000 * 0.1, 1000)).toBe(1000);
  });

  it("keeps amounts below the limit and rounds to cents", () => {
    expect(applyMaxDiscountAmount(500, 1000)).toBe(500);
    expect(applyMaxDiscountAmount(41.666, 1000)).toBe(41.67);
  });

  it("does not limit anything when the coupon has no limit", () => {
    expect(applyMaxDiscountAmount(5000, null)).toBe(5000);
    expect(applyMaxDiscountAmount(5000, undefined)).toBe(5000);
    expect(applyMaxDiscountAmount(5000, 0)).toBe(5000);
  });
});

describe("normalizeMaxDiscountAmount", () => {
  it("accepts positive numbers and numeric strings", () => {
    expect(normalizeMaxDiscountAmount(1000)).toBe(1000);
    expect(normalizeMaxDiscountAmount("1000.00")).toBe(1000);
  });

  it("returns null for empty, zero or invalid values", () => {
    expect(normalizeMaxDiscountAmount(null)).toBeNull();
    expect(normalizeMaxDiscountAmount(0)).toBeNull();
    expect(normalizeMaxDiscountAmount("abc")).toBeNull();
  });
});

describe("formatRewardLimit", () => {
  it("shows whole dollars without cents", () => {
    expect(formatRewardLimit(1000)).toBe("$1,000");
    expect(formatRewardLimit(999.5)).toBe("$999.50");
  });
});
