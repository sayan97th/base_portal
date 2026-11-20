/**
 * Money back promo codes (HAPPYHOLIDAYS) inside CartContext: the client pays
 * the regular price and the cart estimates the gift card they will receive.
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
  getToken: jest.fn(() => null),
}));

function makeRewardCoupon(overrides: Partial<CartAppliedCoupon> = {}): CartAppliedCoupon {
  return {
    coupon_id: "holiday-uuid",
    code: "HAPPYHOLIDAYS",
    coupon_name: "Happy Holidays 10% Back",
    discount_amount: 0,
    discount_type: "gift_card_reward",
    discount_value: 10,
    applies_to: "all",
    product_types: [],
    minimum_purchase_amount: null,
    dr_tier_id: null,
    is_gift_card_reward: true,
    ...overrides,
  };
}

async function renderCartWith(coupon: CartAppliedCoupon) {
  const hook = renderHook(() => useCart(), {
    wrapper: ({ children }) => <CartProvider>{children}</CartProvider>,
  });
  await waitFor(() => expect(hook.result.current.is_cart_ready).toBe(true));

  act(() => {
    hook.result.current.setItemQuantity("link_building", "dr50", "DR 50+", 400, 2);
    hook.result.current.setItemQuantity("new_content", "nc1", "Standard", 200, 1);
  });
  await waitFor(() => expect(hook.result.current.subtotal).toBe(1000));

  act(() => {
    hook.result.current.setAppliedCoupons([coupon]);
  });

  return hook;
}

describe("CartContext money back promo", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("never lowers the price and estimates a 10% gift card", async () => {
    const { result } = await renderCartWith(makeRewardCoupon());

    await waitFor(() => expect(result.current.gift_card_reward_coupon?.code).toBe("HAPPYHOLIDAYS"));
    expect(result.current.total).toBe(1000);
    expect(result.current.total_discount).toBe(0);
    expect(result.current.active_discount_type).toBe("none");
    expect(result.current.gift_card_reward_amount).toBe(100);
  });

  it("only counts the product types the promo covers", async () => {
    const { result } = await renderCartWith(makeRewardCoupon({ product_types: ["link_building"] }));

    await waitFor(() => expect(result.current.gift_card_reward_amount).toBe(80));
    expect(result.current.total).toBe(1000);
  });

  it("updates the estimate when the cart changes", async () => {
    const { result } = await renderCartWith(makeRewardCoupon());
    await waitFor(() => expect(result.current.gift_card_reward_amount).toBe(100));

    act(() => {
      result.current.setItemQuantity("link_building", "dr50", "DR 50+", 400, 4);
    });

    await waitFor(() => expect(result.current.gift_card_reward_amount).toBe(180));
  });

  it("keeps the reward coupon at a zero discount after revalidation", async () => {
    const { result } = await renderCartWith(makeRewardCoupon({ discount_amount: 0 }));

    act(() => {
      result.current.setItemQuantity("new_content", "nc1", "Standard", 200, 3);
    });

    await waitFor(() => expect(result.current.subtotal).toBe(1400));
    expect(result.current.applied_coupons[0]?.discount_amount).toBe(0);
    expect(result.current.total).toBe(1400);
  });

  it("returns no reward without a money back promo", async () => {
    const { result } = await renderCartWith({
      ...makeRewardCoupon({ code: "SAVE10", discount_type: "percentage", is_gift_card_reward: false }),
      discount_amount: 100,
    });

    await waitFor(() => expect(result.current.total_discount).toBe(100));
    expect(result.current.gift_card_reward_coupon).toBeNull();
    expect(result.current.gift_card_reward_amount).toBe(0);
  });

  it("keeps the gift card details until the cart is cleared", async () => {
    const { result } = await renderCartWith(makeRewardCoupon());

    act(() => {
      result.current.setGiftCardRewardDetails({ recipient_email: "me@example.com", gift_card_brand: "visa" });
    });
    expect(result.current.gift_card_reward_details).toEqual({ recipient_email: "me@example.com", gift_card_brand: "visa" });

    act(() => {
      result.current.clearCart();
    });

    expect(result.current.gift_card_reward_details).toEqual({ recipient_email: "", gift_card_brand: "" });
  });
});
