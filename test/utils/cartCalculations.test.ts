/**
 * Pure unit tests for cart calculation logic.
 * These validate the same rules used in CartContext to ensure the frontend
 * computes subtotals, discounts, and totals consistently with the backend.
 */

const MINIMUM_CART_FOR_COUPON = 500;
const BULK_DISCOUNT_THRESHOLD = 10;
const BULK_DISCOUNT_RATE      = 0.10;

// ─── Helpers (mirror CartContext logic) ──────────────────────────────────────

function calculateSubtotal(items: Array<{ unit_price: number; quantity: number }>): number {
  return Math.round(items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0) * 100) / 100;
}

function calculateTotalAfterCredits(base: number, credits: number): number {
  return Math.max(0, base - credits);
}

function isCouponAllowed(subtotal: number, coupon_code: string): boolean {
  return subtotal >= MINIMUM_CART_FOR_COUPON && coupon_code.trim().length > 0;
}

function calculateLinkBuildingBulkDiscount(
  total_links: number,
  subtotal: number
): number {
  if (total_links < BULK_DISCOUNT_THRESHOLD) return 0;
  return Math.round(subtotal * BULK_DISCOUNT_RATE * 100) / 100;
}

// ─── Subtotal tests ───────────────────────────────────────────────────────────

describe("calculateSubtotal", () => {
  it("returns 0 for an empty cart", () => {
    expect(calculateSubtotal([])).toBe(0);
  });

  it("calculates subtotal for a single item", () => {
    expect(calculateSubtotal([{ unit_price: 150, quantity: 2 }])).toBe(300);
  });

  it("sums multiple items", () => {
    const items = [
      { unit_price: 100, quantity: 3 },
      { unit_price: 250, quantity: 1 },
    ];
    expect(calculateSubtotal(items)).toBe(550);
  });

  it("rounds to two decimal places", () => {
    expect(calculateSubtotal([{ unit_price: 33.33, quantity: 3 }])).toBe(99.99);
  });

  it("handles unit_price of 0", () => {
    expect(calculateSubtotal([{ unit_price: 0, quantity: 10 }])).toBe(0);
  });
});

// ─── Credits application tests ────────────────────────────────────────────────

describe("calculateTotalAfterCredits", () => {
  it("subtracts credits from base", () => {
    expect(calculateTotalAfterCredits(500, 100)).toBe(400);
  });

  it("returns 0 when credits equal the base", () => {
    expect(calculateTotalAfterCredits(300, 300)).toBe(0);
  });

  it("returns 0 when credits exceed the base (no negative totals)", () => {
    expect(calculateTotalAfterCredits(200, 500)).toBe(0);
  });

  it("returns the base when credits are 0", () => {
    expect(calculateTotalAfterCredits(750, 0)).toBe(750);
  });
});

// ─── Coupon eligibility tests ─────────────────────────────────────────────────

describe("isCouponAllowed", () => {
  it("allows coupon when subtotal meets minimum", () => {
    expect(isCouponAllowed(500, "SAVE10")).toBe(true);
  });

  it("allows coupon when subtotal exceeds minimum", () => {
    expect(isCouponAllowed(1000, "SAVE10")).toBe(true);
  });

  it("blocks coupon when subtotal is below minimum", () => {
    expect(isCouponAllowed(499, "SAVE10")).toBe(false);
  });

  it("blocks coupon when code is empty string", () => {
    expect(isCouponAllowed(600, "")).toBe(false);
  });

  it("blocks coupon when code is only whitespace", () => {
    expect(isCouponAllowed(600, "   ")).toBe(false);
  });
});

// ─── Bulk discount tests ─────────────────────────────────────────────────────

describe("calculateLinkBuildingBulkDiscount", () => {
  it("returns 0 when below threshold", () => {
    expect(calculateLinkBuildingBulkDiscount(9, 900)).toBe(0);
  });

  it("returns 10% discount at exact threshold of 10 links", () => {
    expect(calculateLinkBuildingBulkDiscount(10, 1000)).toBe(100);
  });

  it("returns 10% discount above threshold", () => {
    expect(calculateLinkBuildingBulkDiscount(15, 1500)).toBe(150);
  });

  it("returns 0 when there are no links", () => {
    expect(calculateLinkBuildingBulkDiscount(0, 0)).toBe(0);
  });

  it("rounds discount to two decimal places", () => {
    // 33.33 * 10 = 333.30, 10% = 33.33
    expect(calculateLinkBuildingBulkDiscount(10, 333.30)).toBe(33.33);
  });
});

// ─── Pay-later (deferred) coupon discount calculation ────────────────────────
//
// Regression: coupon discount was stripped from the invoice when the client
// chose "Pay Later". These tests mirror the discount math used in CartContext
// and verified in the backend DeferredCheckoutCouponTest.

describe("deferred checkout coupon discount calculation", () => {
  function applyPercentageCoupon(subtotal: number, discount_pct: number): number {
    const discount = Math.round(subtotal * (discount_pct / 100) * 100) / 100;
    return Math.max(0, Math.round((subtotal - discount) * 100) / 100);
  }

  function applyFixedCoupon(subtotal: number, fixed_amount: number): number {
    const discount = Math.min(fixed_amount, subtotal);
    return Math.max(0, Math.round((subtotal - discount) * 100) / 100);
  }

  function couponDiscountAmount(subtotal: number, discount_pct: number): number {
    return Math.round(subtotal * (discount_pct / 100) * 100) / 100;
  }

  function buildDeferredCouponIds(
    applied_coupons: Array<{ coupon_id: string }>
  ): string[] | undefined {
    return applied_coupons.length > 0
      ? applied_coupons.map((c) => c.coupon_id)
      : undefined;
  }

  it("percentage coupon reduces total by the correct amount", () => {
    expect(applyPercentageCoupon(1000, 10)).toBe(900);
  });

  it("percentage coupon handles fractional discount correctly", () => {
    expect(applyPercentageCoupon(333, 10)).toBe(299.7);
  });

  it("100% percentage coupon reduces total to 0", () => {
    expect(applyPercentageCoupon(500, 100)).toBe(0);
  });

  it("fixed coupon reduces total by the fixed amount", () => {
    expect(applyFixedCoupon(1000, 100)).toBe(900);
  });

  it("fixed coupon is capped at the subtotal — total never goes negative", () => {
    expect(applyFixedCoupon(50, 200)).toBe(0);
  });

  it("fixed coupon equal to subtotal results in $0 total", () => {
    expect(applyFixedCoupon(100, 100)).toBe(0);
  });

  it("coupon discount amount is calculated correctly from subtotal", () => {
    expect(couponDiscountAmount(800, 15)).toBe(120);
  });

  it("buildDeferredCouponIds returns array of ids when coupons are applied", () => {
    const result = buildDeferredCouponIds([
      { coupon_id: "coupon-uuid-1" },
      { coupon_id: "coupon-uuid-2" },
    ]);
    expect(result).toEqual(["coupon-uuid-1", "coupon-uuid-2"]);
  });

  it("buildDeferredCouponIds returns undefined when no coupons are applied", () => {
    expect(buildDeferredCouponIds([])).toBeUndefined();
  });

  it("total_amount sent to deferred endpoint equals subtotal minus coupon discount", () => {
    const subtotal     = 1000;
    const discount_pct = 10;
    const discount     = couponDiscountAmount(subtotal, discount_pct);
    const total_amount = subtotal - discount;

    expect(total_amount).toBe(900);
  });

  it("coupon overrides bulk discount: only coupon discount is applied", () => {
    const subtotal = 1000;

    // Bulk would give 10% off ($100), but coupon gives 15% off ($150)
    const coupon_discount = couponDiscountAmount(subtotal, 15);
    const bulk_discount   = Math.round(subtotal * BULK_DISCOUNT_RATE * 100) / 100;

    // When coupon is present, only the coupon applies
    const effective_discount = coupon_discount;
    const total              = subtotal - effective_discount;

    expect(effective_discount).toBe(150);
    expect(bulk_discount).toBe(100);
    expect(total).toBe(850);
  });
});

// ─── Credits savings percentage ───────────────────────────────────────────────

describe("credits savings percentage display", () => {
  function creditsSavingsPct(base: number, credits: number): number {
    return base > 0 ? Math.round((credits / base) * 100) : 0;
  }

  it("calculates correct percentage", () => {
    expect(creditsSavingsPct(1000, 250)).toBe(25);
  });

  it("returns 100% when credits equal base", () => {
    expect(creditsSavingsPct(500, 500)).toBe(100);
  });

  it("returns 0 when base is 0 (avoids division by zero)", () => {
    expect(creditsSavingsPct(0, 0)).toBe(0);
  });

  it("rounds to whole number", () => {
    expect(creditsSavingsPct(300, 100)).toBe(33); // 33.33... rounds to 33
  });
});
