import type { AdminGiftCardClaim, Coupon } from "@/types/admin/coupons";

export function makeGiftCardClaim(overrides: Partial<AdminGiftCardClaim> = {}): AdminGiftCardClaim {
  return {
    id: "claim-1",
    coupon_id: "coupon-1",
    session_id: "abcd1234-0000-0000-0000-000000000000",
    order_ids: ["order-1"],
    coupon_code: "HAPPYHOLIDAYS",
    promotion_name: "Happy Holidays 10% Back",
    order_total: 800,
    reward_percentage: 10,
    reward_amount: 80,
    recipient_email: "gifts@example.com",
    gift_card_brand: "amazon",
    gift_card_brand_label: "Amazon",
    submission_source: "checkout",
    status: "submitted",
    is_claimable: false,
    submitted_at: "2026-11-20T10:00:00+00:00",
    fulfilled_at: null,
    created_at: "2026-11-20T10:00:00+00:00",
    client: { id: 1, name: "Jane Client", email: "jane@example.com", company: "Acme" },
    fulfilled_by: null,
    ...overrides,
  };
}

export const ready_claim = makeGiftCardClaim();

export const waiting_claim = makeGiftCardClaim({
  id: "claim-2",
  session_id: "efgh5678-0000-0000-0000-000000000000",
  status: "pending_details",
  recipient_email: null,
  gift_card_brand: null,
  gift_card_brand_label: null,
  submission_source: null,
  submitted_at: null,
  reward_amount: 30,
  order_total: 300,
  created_at: "2026-11-18T10:00:00+00:00",
  client: { id: 2, name: "Bob Waiting", email: "bob@example.com", company: null },
});

export const sent_claim = makeGiftCardClaim({
  id: "claim-3",
  session_id: "ijkl9012-0000-0000-0000-000000000000",
  order_ids: ["order-3a", "order-3b"],
  status: "fulfilled",
  gift_card_brand: "visa",
  gift_card_brand_label: "Visa",
  reward_amount: 50,
  order_total: 500,
  fulfilled_at: "2026-11-21T10:00:00+00:00",
  fulfilled_by: { id: 9, name: "Abby Admin" },
  created_at: "2026-11-19T10:00:00+00:00",
  client: { id: 3, name: "Carla Sent", email: "carla@example.com", company: "Globex" },
});

export const all_claims = [ready_claim, waiting_claim, sent_claim];

export function makeRewardCoupon(overrides: Partial<Coupon> = {}): Coupon {
  return {
    id: "coupon-1",
    code: "HAPPYHOLIDAYS",
    name: "Happy Holidays 10% Back",
    description: null,
    discount_type: "gift_card_reward",
    discount_value: 10,
    applies_to: "all",
    product_types: [],
    dr_tier_ids: [],
    dr_tiers: [],
    minimum_purchase_amount: null,
    starts_at: null,
    expires_at: null,
    usage_limit: null,
    usage_per_user: null,
    times_used: 3,
    is_active: true,
    is_gift_card_reward: true,
    gift_card_claims_count: 3,
    gift_card_claims_awaiting_count: 1,
    created_at: "2026-11-01T00:00:00Z",
    updated_at: "2026-11-01T00:00:00Z",
    ...overrides,
  };
}
