/**
 * One promo code per order inside CartContext.
 *
 * The cart state itself can never hold more than one promo code: every write
 * through setAppliedCoupons is limited, and saved carts (localStorage or the
 * server snapshot) that still hold stacked codes are trimmed on restore.
 */

import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { CartProvider, useCart } from "@/context/CartContext";
import type { CartAppliedCoupon, CartItem } from "@/types/client/unified-cart";

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
  getToken: jest.fn(() => null),
}));

import { unifiedCartService } from "@/services/client/unified-cart.service";
import { getToken } from "@/lib/api-client";

const mockFetchCart = unifiedCartService.fetchCart as jest.MockedFunction<typeof unifiedCartService.fetchCart>;
const mockSaveCart = unifiedCartService.saveCart as jest.MockedFunction<typeof unifiedCartService.saveCart>;
const mockGetToken = getToken as jest.MockedFunction<typeof getToken>;

const CART_STORAGE_KEY = "unified_cart_v1";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeCoupon(overrides: Partial<CartAppliedCoupon> = {}): CartAppliedCoupon {
  return {
    coupon_id:               "save10-uuid",
    code:                    "SAVE10",
    coupon_name:             "Save 10%",
    discount_amount:         40,
    discount_type:           "percentage",
    discount_value:          10,
    applies_to:              "all",
    product_types:           [],
    minimum_purchase_amount: null,
    dr_tier_id:              null,
    ...overrides,
  };
}

const holiday_coupon = makeCoupon({
  coupon_id:           "holiday-uuid",
  code:                "HAPPYHOLIDAYS",
  coupon_name:         "Happy Holidays 10% Back",
  discount_amount:     0,
  discount_type:       "gift_card_reward",
  is_gift_card_reward: true,
});

const save20_coupon = makeCoupon({
  coupon_id:       "save20-uuid",
  code:            "SAVE20",
  coupon_name:     "Save 20%",
  discount_amount: 80,
  discount_value:  20,
});

const cart_item: CartItem = {
  cart_item_id: "item-1",
  product_type: "link_building",
  tier_id:      "dr50",
  tier_name:    "DR 50+",
  quantity:     1,
  unit_price:   400,
} as CartItem;

function writeStoredCart(applied_coupons: CartAppliedCoupon[]) {
  localStorage.setItem(
    CART_STORAGE_KEY,
    JSON.stringify({
      version:           1,
      expires_at:        Date.now() + 60 * 60 * 1000,
      items:             [cart_item],
      applied_coupons,
      coupon_input_code: "",
      order_title:       "",
      order_notes:       "",
    })
  );
}

async function renderReadyCart() {
  const hook = renderHook(() => useCart(), {
    wrapper: ({ children }) => <CartProvider>{children}</CartProvider>,
  });

  await waitFor(() => expect(hook.result.current.is_cart_ready).toBe(true));

  return hook;
}

async function renderCartWithOneLink() {
  const hook = await renderReadyCart();

  act(() => {
    hook.result.current.setItemQuantity("link_building", "dr50", "DR 50+", 400, 1);
  });
  await waitFor(() => expect(hook.result.current.subtotal).toBe(400));

  return hook;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("CartContext, one promo code per order", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockGetToken.mockReturnValue(null);
    mockFetchCart.mockResolvedValue(null);
    mockSaveCart.mockResolvedValue(undefined);
  });

  describe("setAppliedCoupons", () => {
    it("keeps a single promo code", async () => {
      const { result } = await renderCartWithOneLink();

      act(() => {
        result.current.setAppliedCoupons([makeCoupon()]);
      });

      await waitFor(() => expect(result.current.applied_coupons).toHaveLength(1));
      expect(result.current.applied_coupons[0].code).toBe("SAVE10");
    });

    it("never stores two promo codes at once, the first one wins", async () => {
      const { result } = await renderCartWithOneLink();

      act(() => {
        result.current.setAppliedCoupons([makeCoupon(), save20_coupon]);
      });

      await waitFor(() => expect(result.current.applied_coupons).toHaveLength(1));
      expect(result.current.applied_coupons[0].code).toBe("SAVE10");
    });

    it("cannot append a second promo code with an updater function", async () => {
      const { result } = await renderCartWithOneLink();

      act(() => {
        result.current.setAppliedCoupons([holiday_coupon]);
      });
      act(() => {
        result.current.setAppliedCoupons((prev) => [...prev, makeCoupon()]);
      });

      await waitFor(() => expect(result.current.applied_coupons).toHaveLength(1));
      expect(result.current.applied_coupons[0].code).toBe("HAPPYHOLIDAYS");
    });

    it("only applies the discount of the single promo code kept", async () => {
      const { result } = await renderCartWithOneLink();

      act(() => {
        result.current.setAppliedCoupons([makeCoupon(), save20_coupon]);
      });

      await waitFor(() => expect(result.current.total_discount).toBe(40));
      expect(result.current.total).toBe(360);
    });

    it("lets the client swap codes after removing the applied one", async () => {
      const { result } = await renderCartWithOneLink();

      act(() => {
        result.current.setAppliedCoupons([holiday_coupon]);
      });
      act(() => {
        result.current.setAppliedCoupons((prev) => prev.filter((c) => c.code !== "HAPPYHOLIDAYS"));
      });
      await waitFor(() => expect(result.current.applied_coupons).toHaveLength(0));

      act(() => {
        result.current.setAppliedCoupons([makeCoupon()]);
      });

      await waitFor(() => expect(result.current.applied_coupons).toHaveLength(1));
      expect(result.current.applied_coupons[0].code).toBe("SAVE10");
      expect(result.current.gift_card_reward_coupon).toBeNull();
    });
  });

  describe("restoring a saved cart", () => {
    it("trims stacked promo codes saved in localStorage", async () => {
      writeStoredCart([holiday_coupon, makeCoupon()]);

      const { result } = await renderReadyCart();

      await waitFor(() => expect(result.current.items).toHaveLength(1));
      expect(result.current.applied_coupons).toHaveLength(1);
      expect(result.current.applied_coupons[0].code).toBe("HAPPYHOLIDAYS");
    });

    it("trims stacked promo codes coming from the server snapshot", async () => {
      mockGetToken.mockReturnValue("token");
      mockFetchCart.mockResolvedValue({
        items:             [cart_item],
        applied_coupons:   [makeCoupon(), save20_coupon],
        coupon_input_code: "",
        order_title:       "",
        order_notes:       "",
      });

      const { result } = await renderReadyCart();

      await waitFor(() => expect(result.current.items).toHaveLength(1));
      expect(result.current.applied_coupons).toHaveLength(1);
      expect(result.current.applied_coupons[0].code).toBe("SAVE10");
    });

    it("pushes a local cart to the server with at most one promo code", async () => {
      writeStoredCart([holiday_coupon, makeCoupon()]);
      mockGetToken.mockReturnValue("token");
      mockFetchCart.mockResolvedValue(null);

      await renderReadyCart();

      await waitFor(() => expect(mockSaveCart).toHaveBeenCalled());
      const pushed = mockSaveCart.mock.calls[0][0];
      expect(pushed.applied_coupons).toHaveLength(1);
      expect(pushed.applied_coupons[0].code).toBe("HAPPYHOLIDAYS");
    });

    it("restores the money back promo from a saved cart", async () => {
      writeStoredCart([holiday_coupon]);

      const { result } = await renderReadyCart();

      await waitFor(() => expect(result.current.gift_card_reward_coupon?.code).toBe("HAPPYHOLIDAYS"));
    });
  });
});
