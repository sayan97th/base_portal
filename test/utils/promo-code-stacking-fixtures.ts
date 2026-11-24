/**
 * Shared fixtures of the "promotions never stack" tests: bulk discount
 * records, bulk discount details and the two kinds of promo codes.
 */

import type { BulkDiscountDetail, Discount } from "@/types/admin/discounts";
import type { CartAppliedCoupon } from "@/types/client/unified-cart";

export function makeBulkDiscount(overrides: Partial<Discount> = {}): Discount {
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

/** A qualifying discount that the applied promo code replaced. */
export function makeReplacedDetail(
  eligible_discount_amount: number,
  overrides: Partial<BulkDiscountDetail> = {}
): BulkDiscountDetail {
  return {
    config: makeBulkDiscount(),
    is_eligible: true,
    is_blocked_by_promo_code: true,
    is_applied: false,
    eligible_discount_amount,
    discount_amount: 0,
    current_quantity: 10,
    quantity_needed: 0,
    product_subtotal: eligible_discount_amount * 10,
    ...overrides,
  };
}

/** A qualifying discount that lowers the total. */
export function makeAppliedDetail(
  discount_amount: number,
  overrides: Partial<BulkDiscountDetail> = {}
): BulkDiscountDetail {
  return {
    config: makeBulkDiscount(),
    is_eligible: true,
    is_blocked_by_promo_code: false,
    is_applied: true,
    eligible_discount_amount: discount_amount,
    discount_amount,
    current_quantity: 10,
    quantity_needed: 0,
    product_subtotal: discount_amount * 10,
    ...overrides,
  };
}

export function makeRewardCoupon(overrides: Partial<CartAppliedCoupon> = {}): CartAppliedCoupon {
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

export function makePercentageCoupon(overrides: Partial<CartAppliedCoupon> = {}): CartAppliedCoupon {
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
    ...overrides,
  };
}
