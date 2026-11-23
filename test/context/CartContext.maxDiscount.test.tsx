/**
 * Per order coupon limit (max_discount_amount) inside CartContext.
 *
 * HAPPYHOLIDAYS: the gift card estimate shown at checkout is 10% of the
 * order, never more than $1,000. Percentage coupons with a limit never
 * discount more than the limit, also after the cart changes.
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

const LINK_PRICE = 6000;

function makeHolidayCoupon(overrides: Partial<CartAppliedCoupon> = {}): CartAppliedCoupon {
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
    max_discount_amount: 1000,
    dr_tier_id: null,
    is_gift_card_reward: true,
    ...overrides,
  };
}

function makePercentageCoupon(overrides: Partial<CartAppliedCoupon> = {}): CartAppliedCoupon {
  return makeHolidayCoupon({
    coupon_id: "save20-uuid",
    code: "SAVE20",
    coupon_name: "Save 20%",
    discount_type: "percentage",
    discount_value: 20,
    max_discount_amount: 300,
    is_gift_card_reward: false,
    ...overrides,
  });
}

async function renderCart(link_quantity: number, coupon: CartAppliedCoupon) {
  const hook = renderHook(() => useCart(), {
    wrapper: ({ children }) => <CartProvider>{children}</CartProvider>,
  });
  await waitFor(() => expect(hook.result.current.is_cart_ready).toBe(true));

  act(() => {
    hook.result.current.setItemQuantity("link_building", "dr80", "DR 80+", LINK_PRICE, link_quantity);
  });
  await waitFor(() => expect(hook.result.current.subtotal).toBe(LINK_PRICE * link_quantity));

  act(() => {
    hook.result.current.setAppliedCoupons([coupon]);
  });

  return hook;
}

function setLinks(hook: Awaited<ReturnType<typeof renderCart>>, quantity: number) {
  act(() => {
    hook.result.current.setItemQuantity("link_building", "dr80", "DR 80+", LINK_PRICE, quantity);
  });
}

describe("CartContext gift card limit", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("caps the HAPPYHOLIDAYS estimate at $1,000 on a $12,000 order", async () => {
    const { result } = await renderCart(2, makeHolidayCoupon());

    await waitFor(() => expect(result.current.gift_card_reward_coupon?.code).toBe("HAPPYHOLIDAYS"));
    expect(result.current.gift_card_reward_amount).toBe(1000);
    // The client still pays the full price.
    expect(result.current.total).toBe(12000);
    expect(result.current.total_discount).toBe(0);
  });

  it("keeps the full 10% below the limit", async () => {
    const { result } = await renderCart(1, makeHolidayCoupon());

    await waitFor(() => expect(result.current.gift_card_reward_amount).toBe(600));
  });

  it("follows the cart up to the limit and back down", async () => {
    const hook = await renderCart(1, makeHolidayCoupon());
    await waitFor(() => expect(hook.result.current.gift_card_reward_amount).toBe(600));

    setLinks(hook, 5);
    await waitFor(() => expect(hook.result.current.subtotal).toBe(30000));
    expect(hook.result.current.gift_card_reward_amount).toBe(1000);

    setLinks(hook, 1);
    await waitFor(() => expect(hook.result.current.gift_card_reward_amount).toBe(600));
  });

  it("grows without a ceiling when the coupon has no limit", async () => {
    const { result } = await renderCart(2, makeHolidayCoupon({ max_discount_amount: null }));

    await waitFor(() => expect(result.current.gift_card_reward_amount).toBe(1200));
  });

  it("works when the limit comes back from the saved cart without the field", async () => {
    const coupon = makeHolidayCoupon();
    delete coupon.max_discount_amount;
    const { result } = await renderCart(2, coupon);

    await waitFor(() => expect(result.current.gift_card_reward_amount).toBe(1200));
  });

  it("applies the limit to the qualifying products only", async () => {
    const hook = await renderCart(2, makeHolidayCoupon({ product_types: ["link_building"] }));

    act(() => {
      hook.result.current.setItemQuantity("new_content", "nc1", "Standard", 500, 4);
    });

    await waitFor(() => expect(hook.result.current.subtotal).toBe(14000));
    // 10% of the $12,000 link building subtotal is $1,200, limited to $1,000.
    expect(hook.result.current.gift_card_reward_amount).toBe(1000);
  });

  it("keeps the limit on the applied coupon after the cart is recalculated", async () => {
    const hook = await renderCart(2, makeHolidayCoupon());

    setLinks(hook, 3);

    await waitFor(() => expect(hook.result.current.subtotal).toBe(18000));
    expect(hook.result.current.applied_coupons[0]?.max_discount_amount).toBe(1000);
    expect(hook.result.current.applied_coupons[0]?.discount_amount).toBe(0);
  });
});

describe("CartContext percentage discount limit", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("never discounts more than the limit", async () => {
    const { result } = await renderCart(2, makePercentageCoupon());

    // 20% of $12,000 is $2,400, limited to $300.
    await waitFor(() => expect(result.current.applied_coupons[0]?.discount_amount).toBe(300));
    expect(result.current.total_discount).toBe(300);
    expect(result.current.total).toBe(11700);
    expect(result.current.gift_card_reward_amount).toBe(0);
  });

  it("goes back to the plain percentage when the cart shrinks below the limit", async () => {
    const hook = await renderCart(2, makePercentageCoupon({ max_discount_amount: 1500 }));
    await waitFor(() => expect(hook.result.current.total_discount).toBe(1500));

    setLinks(hook, 1);

    // 20% of $6,000 is $1,200, below the $1,500 limit.
    await waitFor(() => expect(hook.result.current.total_discount).toBe(1200));
    expect(hook.result.current.total).toBe(4800);
  });

  it("discounts the full percentage without a limit", async () => {
    const { result } = await renderCart(2, makePercentageCoupon({ max_discount_amount: null }));

    await waitFor(() => expect(result.current.total_discount).toBe(2400));
  });

  it("ignores a limit on fixed amount coupons", async () => {
    const { result } = await renderCart(
      2,
      makePercentageCoupon({ code: "FLAT500", discount_type: "fixed_amount", discount_value: 500, max_discount_amount: 100 })
    );

    await waitFor(() => expect(result.current.total_discount).toBe(500));
  });
});
