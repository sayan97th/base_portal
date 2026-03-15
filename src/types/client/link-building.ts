export interface DrTier {
  id: string;
  dr_label: string;
  traffic_range: string;
  word_count: number;
  price_per_link: number;
  is_most_popular: boolean;
  is_active: boolean;
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
  coupon_id?: string;
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

export interface LinkBuildingOrderDetail {
  id: string;
  order_title: string | null;
  order_notes: string | null;
  total_amount: number;
  status: OrderStatus;
  payment_intent_id: string | null;
  created_at: string;
  updated_at: string;
  items: OrderItemDetail[];
  billing: OrderBillingDetail;
}

export interface CreateOrderResponse {
  order_id: string;
  status: OrderStatus;
  total_amount: number;
  created_at: string;
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

// ── Coupons ────────────────────────────────────────────────────────────────────

export type CouponDiscountType = "percentage" | "fixed_amount";
export type CouponAppliesTo = "all" | "specific_product" | "minimum_purchase";

export interface ValidateCouponPayload {
  code: string;
  order_amount: number;
  dr_tier_ids?: string[];
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
