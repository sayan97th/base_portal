/**
 * Promotions do not stack by default (src/lib/promo-codes.ts
 * isDiscountBlockedByPromoCode).
 *
 * Client request: "We don't want a client to be able to stack promos!"
 * Any promo code removes the automatic discounts, unless the admin allowed a
 * discount to be combined with promo codes. Then the client gets both.
 */

import { isDiscountBlockedByPromoCode } from "@/lib/promo-codes";

describe("isDiscountBlockedByPromoCode", () => {
  const not_combinable = { allow_promo_code_stacking: false };
  const combinable = { allow_promo_code_stacking: true };

  it("keeps every discount when no promo code is applied", () => {
    expect(isDiscountBlockedByPromoCode(not_combinable, false)).toBe(false);
    expect(isDiscountBlockedByPromoCode(combinable, false)).toBe(false);
  });

  it("removes the discount when a promo code is applied, by default", () => {
    expect(isDiscountBlockedByPromoCode(not_combinable, true)).toBe(true);
  });

  it("treats a discount without the option as not combinable", () => {
    expect(isDiscountBlockedByPromoCode({}, true)).toBe(true);
  });

  it("keeps the discount next to the promo code when combining is allowed", () => {
    expect(isDiscountBlockedByPromoCode(combinable, true)).toBe(false);
  });
});
