/**
 * Promotions never stack (src/lib/promo-codes.ts isDiscountBlockedByPromoCode).
 *
 * Client request: "We don't want a client to be able to stack promos!"
 * A promo code removes the automatic discounts, unless the admin allowed a
 * discount to stay next to money back promo codes.
 */

import { isDiscountBlockedByPromoCode } from "@/lib/promo-codes";

describe("isDiscountBlockedByPromoCode", () => {
  const not_stackable = { allow_promo_code_stacking: false };
  const stackable = { allow_promo_code_stacking: true };

  it("keeps the discount when no promo code is applied", () => {
    expect(isDiscountBlockedByPromoCode(not_stackable, false, false)).toBe(false);
    expect(isDiscountBlockedByPromoCode(stackable, false, false)).toBe(false);
  });

  it("always blocks the discount when a price discount promo code is applied", () => {
    expect(isDiscountBlockedByPromoCode(not_stackable, true, false)).toBe(true);
    expect(isDiscountBlockedByPromoCode(stackable, true, false)).toBe(true);
  });

  it("blocks the discount for a money back promo code by default", () => {
    expect(isDiscountBlockedByPromoCode(not_stackable, false, true)).toBe(true);
  });

  it("treats a discount without the option as not stackable", () => {
    expect(isDiscountBlockedByPromoCode({}, false, true)).toBe(true);
  });

  it("keeps the discount for a money back promo code when stacking is allowed", () => {
    expect(isDiscountBlockedByPromoCode(stackable, false, true)).toBe(false);
  });
});
