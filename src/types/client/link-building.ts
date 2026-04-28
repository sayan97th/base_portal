export interface DrTier {
  id: string;
  label: string;
  traffic_range: string;
  word_count: number;
  price_per_link: number;
  is_most_popular: boolean;
  is_active: boolean;
  /** When set to 1, the card becomes a simple toggle (no quantity counter). Unlimited if omitted. */
  max_quantity?: number;
}

export interface ContentRefreshTier {
  id: string;
  label: string;
  word_count_range: string;
  turnaround_days: number;
  price: number;
  sort_order: number;
}

export interface OrderPlacement {
  row_index: number;
  keyword: string | null;
  landing_page: string | null;
  exact_match: boolean;
}

export interface OrderItem {
  dr_tier_id: string;
  quantity: number;
  unit_price: number;
  placements: OrderPlacement[];
}

export interface OrderBilling {
  company?: string | null;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
}

export interface CreateOrderPayload {
  order_title?: string | null;
  order_notes?: string | null;
  total_amount: number;
  coupon_ids?: string[];
  items: OrderItem[];
  billing: OrderBilling;
  payment: {
    payment_method_id: string;
  };
}

export type OrderStatus = "pending" | "processing" | "completed" | "cancelled";

export interface LinkBuildingOrderSummary {
  id: string;
  order_title: string | null;
  total_amount: number;
  status: OrderStatus;
  created_at: string;
  items_count: number;
  updates_count: number;
  last_update_at: string | null;
}

export interface OrderPlacementDetail {
  id: string;
  row_index: number;
  keyword: string | null;
  landing_page: string | null;
  exact_match: boolean;
}

export interface OrderItemDetail {
  id: string;
  dr_tier_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  dr_tier: DrTier;
  placements: OrderPlacementDetail[];
}

export interface OrderBillingDetail {
  id: string;
  company?: string | null;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
}

export interface OrderCouponDetail {
  coupon_id: string;
  code: string;
  name: string;
  discount_type: CouponDiscountType;
  discount_value: number;
  discount_amount: number;
}

export interface LinkBuildingOrderDetail {
  id: string;
  order_title: string | null;
  order_notes: string | null;
  subtotal_before_discount: number;
  total_amount: number;
  status: OrderStatus;
  payment_intent_id: string | null;
  created_at: string;
  updated_at: string;
  items: OrderItemDetail[];
  billing: OrderBillingDetail;
  coupons?: OrderCouponDetail[];
}

export interface CreateOrderResponse {
  order_id: string;
  status: OrderStatus;
  total_amount: number;
  created_at: string;
}

// ── Paginated Responses ────────────────────────────────────────────────────────

export interface ClientPaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface OrderListFilters {
  page?: number;
  per_page?: number;
  search?: string;
}

export interface OrderPlacementFilters {
  page?: number;
  per_page?: number;
  search?: string;
  status?: OrderStatus;
}

/**
 * Flat row returned by GET /api/link-building/order-placements.
 * One row = one placement (keyword + landing page) with its order context.
 * The backend builds this by joining orders → items (with dr_tier) → placements.
 */
export interface OrderPlacementRow {
  order_id: string;
  start_date: string;
  dr_type: string;
  keyword: string | null;
  landing_page: string | null;
  status: OrderStatus;
  live_link: string;
  completed_date: string;
  dr: number | null;
}

// ── Order Tracking ─────────────────────────────────────────────────────────────

export interface OrderUpdateEntry {
  id: string;
  title: string;
  message: string;
  status_change: OrderStatus | null;
  created_at: string;
}

export interface OrderUpdatesListResponse {
  data: OrderUpdateEntry[];
}

// ── Cart ──────────────────────────────────────────────────────────────────────

/**
 * Coupon shape stored inside the cart snapshot.
 * Mirrors AppliedCouponItem (UI) — defined here to keep API types in the
 * types layer and avoid importing from component files.
 */
export interface CartSavedCoupon {
  coupon_id: string;
  code: string;
  coupon_name: string;
  discount_amount: number;
  discount_type: string;
  discount_value: number;
}

export interface CartKeywordRow {
  keyword: string;
  landing_page: string;
  exact_match: boolean;
}

/** Shape of the cart payload sent to and received from the Laravel API. */
export interface CartPayload {
  selected_quantities: Record<string, number>;
  keyword_data: Record<string, CartKeywordRow[]>;
  order_title: string;
  order_notes: string;
  applied_coupons: CartSavedCoupon[];
  coupon_input_code: string;
}

export interface CartResponse {
  data: CartPayload | null;
}

// ── Coupons ────────────────────────────────────────────────────────────────────

export type CouponDiscountType = "percentage" | "fixed_amount";
export type CouponAppliesTo = "all" | "specific_product" | "minimum_purchase";

export interface ValidateCouponPayload {
  code: string;
  order_amount: number;
  dr_tier_ids?: string[];
  dr_tier_amounts?: Record<string, number>;
}

export interface ValidateCouponResponse {
  valid: boolean;
  coupon_id: string;
  code: string;
  name: string;
  discount_type: CouponDiscountType;
  discount_value: number;
  applies_to: CouponAppliesTo;
  dr_tier_id: string | null;
  minimum_purchase_amount: number | null;
  discount_amount: number;
  message: string;
}
