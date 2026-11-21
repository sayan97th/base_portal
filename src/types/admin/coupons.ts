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
  /** First day the coupon works (Y-m-d, promotion timezone). The whole day is included. */
  starts_at: string | null;
  /** Last day the coupon works (Y-m-d, promotion timezone). The whole day is included. */
  expires_at: string | null;
  /** Exact moment the coupon starts working (ISO 8601). */
  active_from?: string | null;
  /** Exact moment the coupon stops working (ISO 8601). */
  active_until?: string | null;
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

export interface GiftCardClaimStatusTotals {
  count: number;
  reward_total: number;
}

export interface GiftCardClaimBrandTotals {
  brand: NonNullable<AdminGiftCardClaim["gift_card_brand"]>;
  label: string;
  count: number;
  reward_total: number;
}

export interface CouponGiftCardClaimsSummary {
  total_count: number;
  client_count: number;
  reward_total: number;
  order_total: number;
  by_status: Record<GiftCardClaimStatus, GiftCardClaimStatusTotals>;
  by_brand: GiftCardClaimBrandTotals[];
  first_created_at: string | null;
  last_created_at: string | null;
}

/** GET /api/admin/coupons/{id}/gift-card-claims */
export interface CouponGiftCardClaimsResponse {
  coupon: Coupon;
  summary: CouponGiftCardClaimsSummary;
  data: AdminGiftCardClaim[];
}

// ── Coupon usage history ─────────────────────────────────────────────────────

export type CouponUsageProductType = ProductType | "premium_mentions";

export interface CouponUsageItem {
  label: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface CouponUsageClient {
  id: number | null;
  name: string;
  email: string;
  company: string | null;
  organization: string | null;
}

export interface CouponUsage {
  id: string;
  order_id: string;
  order_reference: string;
  order_title: string | null;
  session_id: string | null;
  product_type: CouponUsageProductType;
  product_label: string;
  status: string;
  /** True when the order was deleted. The usage stays in the history with its original prices. */
  is_order_deleted: boolean;
  items: CouponUsageItem[];
  items_quantity: number;
  subtotal_before_discount: number;
  discount_amount: number;
  total_amount: number;
  /** Gift card value earned on this order, only for gift card reward coupons. */
  reward_amount: number;
  /** Coupon terms at the moment of the purchase, not the current coupon settings. */
  coupon_terms: {
    code: string;
    name: string | null;
    discount_type: DiscountType;
    discount_value: number;
  };
  gift_card_claim: {
    id: string;
    status: GiftCardClaimStatus | null;
    reward_amount: number;
    gift_card_brand: string | null;
  } | null;
  invoice: { id: string; invoice_number: string | null; status: string | null } | null;
  client: CouponUsageClient | null;
  /** Admin path of the order detail page, null when the product has no detail page. */
  order_url: string | null;
  ordered_at: string | null;
  used_at: string | null;
}

export interface CouponUsageProductBreakdown {
  product_type: CouponUsageProductType;
  product_label: string;
  order_count: number;
  discount_amount: number;
  net_revenue: number;
}

export interface CouponUsageSummary {
  order_count: number;
  /** Checkouts that used the coupon. One checkout can create one order per product. */
  checkout_count: number;
  client_count: number;
  total_discount: number;
  total_reward: number;
  gross_revenue: number;
  net_revenue: number;
  average_order_value: number;
  by_product_type: CouponUsageProductBreakdown[];
  first_used_at: string | null;
  last_used_at: string | null;
}

export interface CouponUsageResponse {
  coupon: Coupon;
  summary: CouponUsageSummary;
  data: CouponUsage[];
}
