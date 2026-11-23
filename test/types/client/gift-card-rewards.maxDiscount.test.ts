/**
 * Per order limit helpers (src/types/client/gift-card-rewards.ts) shared by
 * the cart and the gift card screens. They mirror Coupon::applyMaxDiscount in
 * the API, so the estimate shown at checkout matches the gift card the client
 * receives (HAPPYHOLIDAYS: 10% back, never more than $1,000 per order).
 */

import {
  applyMaxDiscountAmount,
  formatRewardLimit,
  normalizeMaxDiscountAmount,
} from "@/types/client/gift-card-rewards";

describe("applyMaxDiscountAmount", () => {
  it.each([
    [800, 80],
    [9999.9, 999.99],
    [10000, 1000],
    [10000.1, 1000],
    [20000, 1000],
    [50000, 1000],
    [1000000, 1000],
  ])("a $%d order earns a $%d gift card with the $1,000 limit", (order_total, expected) => {
    expect(applyMaxDiscountAmount(order_total * 0.1, 1000)).toBe(expected);
  });

  it("rounds to cents before comparing with the limit", () => {
    expect(applyMaxDiscountAmount(41.666, 1000)).toBe(41.67);
    expect(applyMaxDiscountAmount(999.996, 1000)).toBe(1000);
  });

  it("accepts the limit as a numeric string, as a saved cart may hold it", () => {
    expect(applyMaxDiscountAmount(5000, "1000.00" as unknown as number)).toBe(1000);
  });

  it("does not limit anything without a usable limit", () => {
    expect(applyMaxDiscountAmount(5000, null)).toBe(5000);
    expect(applyMaxDiscountAmount(5000, undefined)).toBe(5000);
    expect(applyMaxDiscountAmount(5000, 0)).toBe(5000);
    expect(applyMaxDiscountAmount(5000, -100)).toBe(5000);
    expect(applyMaxDiscountAmount(5000, Number.NaN)).toBe(5000);
  });
});

describe("normalizeMaxDiscountAmount", () => {
  it("accepts positive numbers and numeric strings", () => {
    expect(normalizeMaxDiscountAmount(1000)).toBe(1000);
    expect(normalizeMaxDiscountAmount(250.5)).toBe(250.5);
    expect(normalizeMaxDiscountAmount("1000.00")).toBe(1000);
  });

  it("returns null for empty, zero, negative or invalid values", () => {
    expect(normalizeMaxDiscountAmount(null)).toBeNull();
    expect(normalizeMaxDiscountAmount(undefined)).toBeNull();
    expect(normalizeMaxDiscountAmount("")).toBeNull();
    expect(normalizeMaxDiscountAmount(0)).toBeNull();
    expect(normalizeMaxDiscountAmount(-1)).toBeNull();
    expect(normalizeMaxDiscountAmount("abc")).toBeNull();
    expect(normalizeMaxDiscountAmount(Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe("formatRewardLimit", () => {
  it("shows whole dollars without cents", () => {
    expect(formatRewardLimit(1000)).toBe("$1,000");
    expect(formatRewardLimit(25000)).toBe("$25,000");
  });

  it("shows cents only when there are some", () => {
    expect(formatRewardLimit(999.5)).toBe("$999.50");
    expect(formatRewardLimit(1250.75)).toBe("$1,250.75");
  });
});
