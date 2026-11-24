/**
 * Promotions never stack (CartContext).
 *
 * Client request: "We don't want a client to be able to stack promos!"
 * An applied promo code removes the bulk discount from the cart. Admins can
 * let a discount stay next to money back promo codes with
 * "allow_promo_code_stacking". Price discount promo codes always replace it.
 *
 * Unless stated otherwise the cart has 10 links at $400 ($4,000), which meets
 * the 10% bulk discount threshold ($400 off).
 */

import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { CartProvider, useCart } from "@/context/CartContext";
import { getActiveDiscounts } from "@/services/client/discounts.service";
import type { Discount } from "@/types/admin/discounts";
import {
  makeBulkDiscount,
  makePercentageCoupon,
  makeRewardCoupon,
} from "../utils/promo-code-stacking-fixtures";

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

const CART_STORAGE_KEY = "unified_cart_v1";

async function renderCartWithDiscounts(discounts: Discount[]) {
  mock_get_active_discounts.mockResolvedValue(discounts);

  const hook = renderHook(() => useCart(), {
    wrapper: ({ children }) => <CartProvider>{children}</CartProvider>,
  });
  await waitFor(() => expect(hook.result.current.is_cart_ready).toBe(true));
  await waitFor(() => expect(hook.result.current.bulk_discount_configs).toHaveLength(discounts.length));

  return hook;
}

async function renderBulkCart(discount: Discount = makeBulkDiscount()) {
  const hook = await renderCartWithDiscounts([discount]);

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

  // ─── Without a promo code ──────────────────────────────────────────────────

  describe("without a promo code", () => {
    it("applies the bulk discount", async () => {
      const { result } = await renderBulkCart();

      expect(result.current.total).toBe(3600);
      expect(result.current.active_discount_type).toBe("bulk");
      expect(result.current.bulk_discount_details[0]).toMatchObject({
        is_eligible: true,
        is_blocked_by_promo_code: false,
        is_applied: true,
        eligible_discount_amount: 400,
        discount_amount: 400,
      });
    });

    it("is not eligible below the minimum quantity", async () => {
      const { result } = await renderCartWithDiscounts([makeBulkDiscount()]);

      act(() => result.current.setItemQuantity("link_building", "dr50", "DR 50+", 400, 9));

      await waitFor(() => expect(result.current.subtotal).toBe(3600));
      expect(result.current.bulk_discount_details[0]).toMatchObject({
        is_eligible: false,
        is_blocked_by_promo_code: false,
        is_applied: false,
        quantity_needed: 1,
        eligible_discount_amount: 0,
      });
      expect(result.current.total).toBe(3600);
    });
  });

  // ─── Money back promo codes ───────────────────────────────────────────────

  describe("money back promo code", () => {
    it("removes the bulk discount by default", async () => {
      const { result } = await renderBulkCart();

      act(() => result.current.setAppliedCoupons([makeRewardCoupon()]));

      await waitFor(() => expect(result.current.bulk_discount_amount).toBe(0));
      expect(result.current.total).toBe(4000);
      expect(result.current.subtotal_after_bulk).toBe(4000);
      expect(result.current.effective_discount_amount).toBe(0);
      expect(result.current.active_discount_type).toBe("none");
      expect(result.current.bulk_discount_details[0]).toMatchObject({
        is_eligible: true,
        is_blocked_by_promo_code: true,
        is_applied: false,
        eligible_discount_amount: 400,
        discount_amount: 0,
      });
    });

    it("bases the gift card on the full price", async () => {
      const { result } = await renderBulkCart();

      act(() => result.current.setAppliedCoupons([makeRewardCoupon()]));

      await waitFor(() => expect(result.current.gift_card_reward_amount).toBe(400));
    });

    it("keeps the bulk discount when stacking is allowed", async () => {
      const { result } = await renderBulkCart(makeBulkDiscount({ allow_promo_code_stacking: true }));

      act(() => result.current.setAppliedCoupons([makeRewardCoupon()]));

      await waitFor(() => expect(result.current.gift_card_reward_coupon).not.toBeNull());
      expect(result.current.total).toBe(3600);
      expect(result.current.active_discount_type).toBe("bulk");
      expect(result.current.gift_card_reward_amount).toBe(360);
      expect(result.current.bulk_discount_details[0].is_blocked_by_promo_code).toBe(false);
    });

    it("bases a product restricted gift card on the stacked price when stacking is allowed", async () => {
      const { result } = await renderCartWithDiscounts([makeBulkDiscount({ allow_promo_code_stacking: true })]);

      act(() => {
        result.current.setItemQuantity("link_building", "dr50", "DR 50+", 400, 10);
        result.current.setItemQuantity("new_content", "nc1", "Standard", 200, 1);
      });
      await waitFor(() => expect(result.current.subtotal).toBe(4200));

      act(() => result.current.setAppliedCoupons([makeRewardCoupon({ product_types: ["link_building"] })]));

      await waitFor(() => expect(result.current.gift_card_reward_amount).toBe(360));
      expect(result.current.total).toBe(3800);
    });

    it("bases a product restricted gift card on the full price by default", async () => {
      const { result } = await renderCartWithDiscounts([makeBulkDiscount()]);

      act(() => {
        result.current.setItemQuantity("link_building", "dr50", "DR 50+", 400, 10);
        result.current.setItemQuantity("new_content", "nc1", "Standard", 200, 1);
      });
      await waitFor(() => expect(result.current.subtotal).toBe(4200));

      act(() => result.current.setAppliedCoupons([makeRewardCoupon({ product_types: ["link_building"] })]));

      await waitFor(() => expect(result.current.gift_card_reward_amount).toBe(400));
      expect(result.current.total).toBe(4200);
    });
  });

  // ─── Price discount promo codes ───────────────────────────────────────────

  describe("price discount promo code", () => {
    it("always replaces the bulk discount, even when stacking is allowed", async () => {
      const { result } = await renderBulkCart(makeBulkDiscount({ allow_promo_code_stacking: true }));

      act(() => result.current.setAppliedCoupons([makePercentageCoupon()]));

      await waitFor(() => expect(result.current.active_discount_type).toBe("coupon"));
      expect(result.current.bulk_discount_amount).toBe(0);
      expect(result.current.effective_discount_amount).toBe(200);
      expect(result.current.total).toBe(3800);
      expect(result.current.bulk_discount_details[0]).toMatchObject({
        is_eligible: true,
        is_blocked_by_promo_code: true,
        is_applied: false,
      });
    });

    it("replaces the bulk discount even when the promo saves less", async () => {
      const { result } = await renderBulkCart();

      act(() => result.current.setAppliedCoupons([makePercentageCoupon()]));

      await waitFor(() => expect(result.current.total).toBe(3800));
      expect(result.current.total).toBeGreaterThan(3600);
    });
  });

  // ─── Several discount records ─────────────────────────────────────────────

  describe("several discounts", () => {
    it("only keeps the discounts that allow stacking next to a money back promo code", async () => {
      const { result } = await renderCartWithDiscounts([
        makeBulkDiscount({ id: "bulk-lb", allow_promo_code_stacking: true }),
        makeBulkDiscount({
          id: "bulk-nc",
          name: "Bulk Content Discount",
          applies_to: "new_content",
          min_quantity: 2,
          discount_rate: 20,
        }),
      ]);

      act(() => {
        result.current.setItemQuantity("link_building", "dr50", "DR 50+", 400, 10);
        result.current.setItemQuantity("new_content", "nc1", "Standard", 100, 2);
      });
      await waitFor(() => expect(result.current.bulk_discount_amount).toBe(440));

      act(() => result.current.setAppliedCoupons([makeRewardCoupon()]));

      await waitFor(() => expect(result.current.bulk_discount_amount).toBe(400));
      const [link_building, new_content] = result.current.bulk_discount_details;
      expect(link_building).toMatchObject({ is_applied: true, discount_amount: 400 });
      expect(new_content).toMatchObject({ is_applied: false, is_blocked_by_promo_code: true, eligible_discount_amount: 40 });
      expect(result.current.total).toBe(3800);
    });
  });

  // ─── Cart changes while a promo code is applied ───────────────────────────

  describe("cart changes", () => {
    it("brings the bulk discount back when the promo code is removed", async () => {
      const { result } = await renderBulkCart();

      act(() => result.current.setAppliedCoupons([makeRewardCoupon()]));
      await waitFor(() => expect(result.current.total).toBe(4000));

      act(() => result.current.setAppliedCoupons([]));
      await waitFor(() => expect(result.current.total).toBe(3600));
    });

    it("does not apply the bulk discount when the cart reaches the minimum with a promo code applied", async () => {
      const { result } = await renderCartWithDiscounts([makeBulkDiscount()]);

      act(() => result.current.setItemQuantity("link_building", "dr50", "DR 50+", 400, 5));
      await waitFor(() => expect(result.current.subtotal).toBe(2000));
      act(() => result.current.setAppliedCoupons([makeRewardCoupon()]));
      await waitFor(() => expect(result.current.gift_card_reward_coupon).not.toBeNull());

      act(() => result.current.setItemQuantity("link_building", "dr50", "DR 50+", 400, 12));

      await waitFor(() => expect(result.current.subtotal).toBe(4800));
      expect(result.current.bulk_discount_details[0]).toMatchObject({ is_eligible: true, is_applied: false });
      expect(result.current.total).toBe(4800);
      expect(result.current.gift_card_reward_amount).toBe(480);
    });

    it("keeps the money back promo code applied while the bulk discount is replaced", async () => {
      const { result } = await renderBulkCart();

      act(() => result.current.setAppliedCoupons([makeRewardCoupon()]));
      await waitFor(() => expect(result.current.total).toBe(4000));

      act(() => result.current.setItemQuantity("link_building", "dr50", "DR 50+", 400, 11));

      await waitFor(() => expect(result.current.subtotal).toBe(4400));
      expect(result.current.applied_coupons.map((c) => c.code)).toEqual(["HAPPYHOLIDAYS"]);
      expect(result.current.coupon_adjustment_notice).toBeNull();
    });
  });

  // ─── Restored carts ───────────────────────────────────────────────────────

  describe("restored cart", () => {
    it("does not stack promotions on a cart restored from the browser", async () => {
      localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify({
          items: [
            {
              cart_item_id: "lb-1",
              product_type: "link_building",
              tier_id: "dr50",
              tier_name: "DR 50+",
              quantity: 10,
              unit_price: 400,
            },
          ],
          applied_coupons: [makeRewardCoupon()],
          coupon_input_code: "",
          order_title: "",
          order_notes: "",
          version: 1,
          expires_at: Date.now() + 60_000,
        })
      );

      const { result } = await renderCartWithDiscounts([makeBulkDiscount()]);

      await waitFor(() => expect(result.current.subtotal).toBe(4000));
      expect(result.current.gift_card_reward_coupon?.code).toBe("HAPPYHOLIDAYS");
      expect(result.current.bulk_discount_amount).toBe(0);
      expect(result.current.total).toBe(4000);
    });
  });
});
