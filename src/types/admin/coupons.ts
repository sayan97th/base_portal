export type DiscountType = "percentage" | "fixed_amount" | "gift_card_reward";
export type AppliesTo = "all" | "specific_product" | "minimum_purchase";
export type ProductType =
  | "link_building"
  | "new_content"
  | "content_optimization"
  | "content_brief";

export const PRODUCT_TYPE_OPTIONS: { value: ProductType; label: string }[] = [
  { value: "link_building", label: "Link Building" },
  { value: "new_content", label: "New Content" },
  { value: "content_optimization", label: "Content Optimizations" },
  { value: "content_brief", label: "Content Briefs" },
];

export interface CouponDrTier {
  id: string;
  label: string;
  price_per_link: number;
  is_active: boolean;
}

export interface Coupon {
  id: string;
  code: string;
  name: string;
  description: string | null;
  discount_type: DiscountType;
  discount_value: number;
  applies_to: AppliesTo;
  product_types: ProductType[];
  dr_tier_ids: string[];
  dr_tiers: CouponDrTier[];
  minimum_purchase_amount: number | null;
  starts_at: string | null;
  expires_at: string | null;
  usage_limit: number | null;
  usage_per_user: number | null;
  times_used: number;
  is_active: boolean;
  /** Money back promo: discount_value is the gift card percentage. */
  is_gift_card_reward?: boolean;
  gift_card_claims_count?: number;
  /** Gift card requests submitted by clients and not yet marked as sent. */
  gift_card_claims_awaiting_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCouponPayload {
  code: string;
  name: string;
  description?: string | null;
  discount_type: DiscountType;
  discount_value: number;
  applies_to: AppliesTo;
  product_types?: ProductType[];
  dr_tier_ids?: string[];
  minimum_purchase_amount?: number | null;
  starts_at?: string | null;
  expires_at: string | null;
  usage_limit?: number | null;
  usage_per_user?: number | null;
  is_active: boolean;
}

export type UpdateCouponPayload = Partial<CreateCouponPayload>;

export interface CouponListResponse {
  data: Coupon[];
}

export interface CouponDetailResponse {
  data: Coupon;
}

// ── Promo gift card requests ─────────────────────────────────────────────────

export type GiftCardClaimStatus = "pending_details" | "submitted" | "fulfilled";

export interface AdminGiftCardClaim {
  id: string;
  coupon_id: string | null;
  session_id: string;
  order_ids: string[];
  coupon_code: string;
  promotion_name: string;
  order_total: number;
  reward_percentage: number;
  reward_amount: number;
  recipient_email: string | null;
  gift_card_brand: "amazon" | "visa" | "target" | null;
  gift_card_brand_label: string | null;
  submission_source: "checkout" | "order_page" | null;
  status: GiftCardClaimStatus;
  is_claimable: boolean;
  submitted_at: string | null;
  fulfilled_at: string | null;
  created_at: string | null;
  client: { id: number; name: string; email: string; company: string | null } | null;
  fulfilled_by: { id: number; name: string } | null;
}

export interface AdminGiftCardClaimFilters {
  coupon_id?: string;
  session_id?: string;
  order_id?: string;
  status?: GiftCardClaimStatus;
}
