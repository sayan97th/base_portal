/**
 * Shared promo code rules (src/lib/promo-codes.ts).
 *
 * Client request: only one promo code per order. When a client tries to add
 * another one they must see "This promo cannot be combined with other offers."
 * The same copy is returned by the API (Coupon::COMBINATION_ERROR_MESSAGE).
 */

import {
  MAX_PROMO_CODES_PER_ORDER,
  PROMO_COMBINATION_ERROR_MESSAGE,
  limitToSinglePromoCode,
} from "@/lib/promo-codes";

describe("promo code rules", () => {
  it("allows exactly one promo code per order", () => {
    expect(MAX_PROMO_CODES_PER_ORDER).toBe(1);
  });

  it("uses the exact copy requested by the client", () => {
    expect(PROMO_COMBINATION_ERROR_MESSAGE).toBe("This promo cannot be combined with other offers.");
  });

  it("never uses an em dash in the client facing copy", () => {
    expect(PROMO_COMBINATION_ERROR_MESSAGE).not.toContain("—");
  });

  describe("limitToSinglePromoCode", () => {
    it("returns an empty list when nothing is stored", () => {
      expect(limitToSinglePromoCode(undefined)).toEqual([]);
      expect(limitToSinglePromoCode(null)).toEqual([]);
      expect(limitToSinglePromoCode([])).toEqual([]);
    });

    it("keeps a single promo code untouched", () => {
      expect(limitToSinglePromoCode([{ code: "HAPPYHOLIDAYS" }])).toEqual([{ code: "HAPPYHOLIDAYS" }]);
    });

    it("keeps only the first promo code when several are stored", () => {
      expect(limitToSinglePromoCode([{ code: "HAPPYHOLIDAYS" }, { code: "SAVE10" }, { code: "SAVE20" }])).toEqual([
        { code: "HAPPYHOLIDAYS" },
      ]);
    });

    it("does not mutate the original list", () => {
      const stored = [{ code: "HAPPYHOLIDAYS" }, { code: "SAVE10" }];

      limitToSinglePromoCode(stored);

      expect(stored).toHaveLength(2);
    });
  });
});
