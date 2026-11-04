/**
 * Coupon revalidation inside CartContext.
 *
 * Regression coverage: the cart used to remove every applied promo code as soon
 * as the subtotal dropped below a hard coded $500.00. There is no global
 * minimum anymore. A coupon is only removed when it stops qualifying on its own
 * rules (its own minimum_purchase_amount, product type or DR tier).
 */

import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { CartProvider, useCart } from "@/context/CartContext";
import type { CartAppliedCoupon } from "@/types/client/unified-cart";

jest.mock("@/services/client/unified-cart.service", () => ({
  unifiedCartService: {
    fetchCart: jest.fn(() => Promise.resolve(null)),
    saveCart: jest.fn(() => Promise.resolve()),
    deleteCart: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock("@/services/client/discounts.service", () => ({
  getActiveDiscounts: jest.fn(() => Promise.resolve([])),
}));

jest.mock("@/lib/api-client", () => ({
  // Guest mode keeps the cart local, so no server snapshot can overwrite state.
  getToken: jest.fn(() => null),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeCoupon(overrides: Partial<CartAppliedCoupon> = {}): CartAppliedCoupon {
  return {
    coupon_id:               "coupon-uuid",
    code:                    "CONF25",
    coupon_name:             "Conference 25",
    discount_amount:         100,
    discount_type:           "percentage",
    discount_value:          25,
    applies_to:              "all",
    product_types:           [],
    minimum_purchase_amount: null,
    dr_tier_id:              null,
    ...overrides,
  };
}

async function renderReadyCart() {
  const hook = renderHook(() => useCart(), {
    wrapper: ({ children }) => <CartProvider>{children}</CartProvider>,
  });

  await waitFor(() => expect(hook.result.current.is_cart_ready).toBe(true));

  return hook;
}

/** Puts one DR 50+ link at $400 in the cart, the exact cart from the client report. */
async function renderSmallCartWithCoupon(coupon: CartAppliedCoupon) {
  const hook = await renderReadyCart();

  act(() => {
    hook.result.current.setItemQuantity("link_building", "dr50", "DR 50+", 400, 1);
  });
  await waitFor(() => expect(hook.result.current.subtotal).toBe(400));

  act(() => {
    hook.result.current.setAppliedCoupons([coupon]);
  });

  return hook;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("CartContext coupon revalidation", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("no global cart minimum", () => {
    it("keeps a promo code applied on a $400 cart", async () => {
      const { result } = await renderSmallCartWithCoupon(makeCoupon());

      await waitFor(() => expect(result.current.applied_coupons).toHaveLength(1));

      expect(result.current.applied_coupons[0].code).toBe("CONF25");
      expect(result.current.coupon_adjustment_notice).toBeNull();
      expect(result.current.active_discount_type).toBe("coupon");
      expect(result.current.total).toBe(300);
    });

    it("keeps the promo code when the cart drops from above $500 to below it", async () => {
      const { result } = await renderReadyCart();

      act(() => {
        result.current.setItemQuantity("link_building", "dr50", "DR 50+", 400, 2);
      });
      await waitFor(() => expect(result.current.subtotal).toBe(800));

      act(() => {
        result.current.setAppliedCoupons([makeCoupon({ discount_amount: 200 })]);
      });
      await waitFor(() => expect(result.current.total).toBe(600));

      act(() => {
        result.current.setItemQuantity("link_building", "dr50", "DR 50+", 400, 1);
      });

      await waitFor(() => expect(result.current.subtotal).toBe(400));
      await waitFor(() => expect(result.current.applied_coupons[0]?.discount_amount).toBe(100));

      expect(result.current.applied_coupons).toHaveLength(1);
      expect(result.current.total).toBe(300);
      expect(result.current.coupon_adjustment_notice).toBeNull();
    });

    it("recalculates a percentage discount on a very small cart", async () => {
      const { result } = await renderReadyCart();

      act(() => {
        result.current.setItemQuantity("new_content", "basic", "Basic Article", 50, 1);
      });
      await waitFor(() => expect(result.current.subtotal).toBe(50));

      act(() => {
        result.current.setAppliedCoupons([makeCoupon({ discount_value: 10, discount_amount: 999 })]);
      });

      await waitFor(() => expect(result.current.applied_coupons[0]?.discount_amount).toBe(5));
      expect(result.current.total).toBe(45);
    });

    it("caps a fixed amount discount at a small cart subtotal", async () => {
      const { result } = await renderSmallCartWithCoupon(
        makeCoupon({
          code:            "FLAT500",
          discount_type:   "fixed_amount",
          discount_value:  500,
          discount_amount: 500,
        })
      );

      await waitFor(() => expect(result.current.applied_coupons[0]?.discount_amount).toBe(400));
      expect(result.current.total).toBe(0);
    });
  });

  describe("per coupon rules are still enforced", () => {
    it("removes a coupon whose own minimum purchase is no longer met", async () => {
      const { result } = await renderReadyCart();

      act(() => {
        result.current.setItemQuantity("link_building", "dr50", "DR 50+", 400, 3);
      });
      await waitFor(() => expect(result.current.subtotal).toBe(1200));

      act(() => {
        result.current.setAppliedCoupons([
          makeCoupon({
            code:                    "BIGORDER",
            applies_to:              "minimum_purchase",
            minimum_purchase_amount: 1000,
            discount_amount:         300,
          }),
        ]);
      });
      await waitFor(() => expect(result.current.applied_coupons).toHaveLength(1));

      act(() => {
        result.current.setItemQuantity("link_building", "dr50", "DR 50+", 400, 2);
      });

      await waitFor(() => expect(result.current.applied_coupons).toHaveLength(0));
      expect(result.current.coupon_adjustment_notice).toBe(
        'Promo code "BIGORDER" was removed because your cart no longer meets the $1,000.00 minimum purchase requirement.'
      );
    });

    it("keeps a coupon whose own minimum is still met on a cart under $500", async () => {
      const { result } = await renderSmallCartWithCoupon(
        makeCoupon({
          code:                    "SMALLMIN",
          applies_to:              "minimum_purchase",
          minimum_purchase_amount: 250,
        })
      );

      await waitFor(() => expect(result.current.applied_coupons).toHaveLength(1));
      expect(result.current.coupon_adjustment_notice).toBeNull();
    });

    it("removes a product type coupon when no qualifying products remain", async () => {
      const { result } = await renderReadyCart();

      act(() => {
        result.current.setItemQuantity("link_building", "dr50", "DR 50+", 400, 1);
        result.current.setItemQuantity("new_content", "basic", "Basic Article", 100, 1);
      });
      await waitFor(() => expect(result.current.subtotal).toBe(500));

      act(() => {
        result.current.setAppliedCoupons([
          makeCoupon({ code: "CONTENT20", product_types: ["new_content"], discount_amount: 20 }),
        ]);
      });
      await waitFor(() => expect(result.current.applied_coupons).toHaveLength(1));

      act(() => {
        result.current.setItemQuantity("new_content", "basic", "Basic Article", 100, 0);
      });

      await waitFor(() => expect(result.current.applied_coupons).toHaveLength(0));
      expect(result.current.coupon_adjustment_notice).toBe(
        'Promo code "CONTENT20" was removed because none of the qualifying products remain in your cart.'
      );
    });

    it("discounts only the qualifying product type on a small cart", async () => {
      const { result } = await renderReadyCart();

      act(() => {
        result.current.setItemQuantity("link_building", "dr50", "DR 50+", 300, 1);
        result.current.setItemQuantity("new_content", "basic", "Basic Article", 100, 1);
      });
      await waitFor(() => expect(result.current.subtotal).toBe(400));

      act(() => {
        result.current.setAppliedCoupons([
          makeCoupon({ code: "CONTENT20", product_types: ["new_content"], discount_value: 20, discount_amount: 0 }),
        ]);
      });

      await waitFor(() => expect(result.current.applied_coupons[0]?.discount_amount).toBe(20));
      expect(result.current.total).toBe(380);
    });

    it("removes a DR tier coupon when the qualifying tier leaves the cart", async () => {
      const { result } = await renderReadyCart();

      act(() => {
        result.current.setItemQuantity("link_building", "dr50", "DR 50+", 400, 1);
        result.current.setItemQuantity("link_building", "dr30", "DR 30+", 100, 1);
      });
      await waitFor(() => expect(result.current.subtotal).toBe(500));

      act(() => {
        result.current.setAppliedCoupons([
          makeCoupon({ code: "DR50ONLY", applies_to: "specific_product", dr_tier_id: "dr50" }),
        ]);
      });
      await waitFor(() => expect(result.current.applied_coupons).toHaveLength(1));

      act(() => {
        result.current.setItemQuantity("link_building", "dr50", "DR 50+", 400, 0);
      });

      await waitFor(() => expect(result.current.applied_coupons).toHaveLength(0));
      expect(result.current.coupon_adjustment_notice).toBe(
        'Promo code "DR50ONLY" was removed because the qualifying product is no longer in your cart.'
      );
    });
  });

  describe("adjustment notices", () => {
    it("never uses an em dash in the removal notice", async () => {
      const { result } = await renderReadyCart();

      act(() => {
        result.current.setItemQuantity("new_content", "basic", "Basic Article", 100, 1);
      });
      await waitFor(() => expect(result.current.subtotal).toBe(100));

      act(() => {
        result.current.setAppliedCoupons([
          makeCoupon({ code: "LBONLY", product_types: ["link_building"] }),
        ]);
      });

      await waitFor(() => expect(result.current.coupon_adjustment_notice).not.toBeNull());
      expect(result.current.coupon_adjustment_notice).not.toContain("—");
    });
  });
});
