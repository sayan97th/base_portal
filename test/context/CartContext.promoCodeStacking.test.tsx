/**
 * Promotions never stack: an applied promo code removes the bulk discount
 * from the cart. Admins can let a discount stay next to money back promo
 * codes with "allow_promo_code_stacking". Price discount promo codes always
 * replace it.
 *
 * Every scenario has 10 links at $400 ($4,000), which meets the 10% bulk
 * discount threshold ($400 off).
 */

import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { CartProvider, useCart } from "@/context/CartContext";
import { getActiveDiscounts } from "@/services/client/discounts.service";
import type { CartAppliedCoupon } from "@/types/client/unified-cart";
import type { Discount } from "@/types/admin/discounts";

jest.mock("@/services/client/unified-cart.service", () => ({
  unifiedCartService: {
    fetchCart: jest.fn(() => Promise.resolve(null)),
    saveCart: jest.fn(() => Promise.resolve()),
    deleteCart: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock("@/services/client/discounts.service", () => ({
  getActiveDiscounts: jest.fn(),
}));

jest.mock("@/lib/api-client", () => ({
  getToken: jest.fn(() => null),
}));

const mock_get_active_discounts = getActiveDiscounts as jest.MockedFunction<typeof getActiveDiscounts>;

function makeBulkDiscount(overrides: Partial<Discount> = {}): Discount {
  return {
    id: "bulk-lb",
    name: "Bulk Link Building Discount",
    description: null,
    discount_type: "bulk",
    discount_rate: 10,
    min_quantity: 10,
    applies_to: "link_building",
    allow_promo_code_stacking: false,
    is_active: true,
    dr_tier_ids: [],
    dr_tiers: [],
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeRewardCoupon(): CartAppliedCoupon {
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
  };
}

function makePercentageCoupon(): CartAppliedCoupon {
  return {
    coupon_id: "save5-uuid",
    code: "SAVE5",
    coupon_name: "Save 5%",
    discount_amount: 200,
    discount_type: "percentage",
    discount_value: 5,
    applies_to: "all",
    product_types: [],
    minimum_purchase_amount: null,
    dr_tier_id: null,
  };
}

async function renderBulkCart(discount: Discount) {
  mock_get_active_discounts.mockResolvedValue([discount]);

  const hook = renderHook(() => useCart(), {
    wrapper: ({ children }) => <CartProvider>{children}</CartProvider>,
  });
  await waitFor(() => expect(hook.result.current.is_cart_ready).toBe(true));
  await waitFor(() => expect(hook.result.current.bulk_discount_configs).toHaveLength(1));

  act(() => {
    hook.result.current.setItemQuantity("link_building", "dr50", "DR 50+", 400, 10);
  });
  await waitFor(() => expect(hook.result.current.bulk_discount_amount).toBe(400));

  return hook;
}

describe("CartContext promo code stacking", () => {
  beforeEach(() => {
    localStorage.clear();
    mock_get_active_discounts.mockReset();
  });

  it("applies the bulk discount when no promo code is used", async () => {
    const { result } = await renderBulkCart(makeBulkDiscount());

    expect(result.current.total).toBe(3600);
    expect(result.current.active_discount_type).toBe("bulk");
    expect(result.current.bulk_discount_details[0]).toMatchObject({
      is_eligible: true,
      is_blocked_by_promo_code: false,
      is_applied: true,
    });
  });

  it("removes the bulk discount when a money back promo code is applied", async () => {
    const { result } = await renderBulkCart(makeBulkDiscount());

    act(() => result.current.setAppliedCoupons([makeRewardCoupon()]));

    await waitFor(() => expect(result.current.bulk_discount_amount).toBe(0));
    expect(result.current.total).toBe(4000);
    expect(result.current.active_discount_type).toBe("none");
    expect(result.current.bulk_discount_details[0]).toMatchObject({
      is_eligible: true,
      is_blocked_by_promo_code: true,
      is_applied: false,
      eligible_discount_amount: 400,
      discount_amount: 0,
    });
  });

  it("bases the gift card on the full price when the bulk discount is replaced", async () => {
    const { result } = await renderBulkCart(makeBulkDiscount());

    act(() => result.current.setAppliedCoupons([makeRewardCoupon()]));

    await waitFor(() => expect(result.current.gift_card_reward_amount).toBe(400));
  });

  it("keeps the bulk discount next to a money back promo code when stacking is allowed", async () => {
    const { result } = await renderBulkCart(makeBulkDiscount({ allow_promo_code_stacking: true }));

    act(() => result.current.setAppliedCoupons([makeRewardCoupon()]));

    await waitFor(() => expect(result.current.gift_card_reward_coupon).not.toBeNull());
    expect(result.current.total).toBe(3600);
    expect(result.current.active_discount_type).toBe("bulk");
    expect(result.current.gift_card_reward_amount).toBe(360);
  });

  it("always replaces the bulk discount with a price discount promo code", async () => {
    const { result } = await renderBulkCart(makeBulkDiscount({ allow_promo_code_stacking: true }));

    act(() => result.current.setAppliedCoupons([makePercentageCoupon()]));

    await waitFor(() => expect(result.current.active_discount_type).toBe("coupon"));
    expect(result.current.bulk_discount_amount).toBe(0);
    expect(result.current.total).toBe(3800);
  });

  it("brings the bulk discount back when the promo code is removed", async () => {
    const { result } = await renderBulkCart(makeBulkDiscount());

    act(() => result.current.setAppliedCoupons([makeRewardCoupon()]));
    await waitFor(() => expect(result.current.total).toBe(4000));

    act(() => result.current.setAppliedCoupons([]));
    await waitFor(() => expect(result.current.total).toBe(3600));
  });
});
