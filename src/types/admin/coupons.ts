export type DiscountType = "percentage" | "fixed_amount";
export type AppliesTo = "all" | "specific_product" | "minimum_purchase";

export interface Coupon {
  id: string;
  code: string;
  name: string;
  description: string | null;
  discount_type: DiscountType;
  discount_value: number;
  applies_to: AppliesTo;
  dr_tier_id: string | null;
  dr_tier_label: string | null;
  minimum_purchase_amount: number | null;
  starts_at: string | null;
  expires_at: string;
  usage_limit: number | null;
  usage_per_user: number | null;
  times_used: number;
  is_active: boolean;
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
  dr_tier_id?: string | null;
  minimum_purchase_amount?: number | null;
  starts_at?: string | null;
  expires_at: string;
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
