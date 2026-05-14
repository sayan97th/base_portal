export type DiscountType = "percentage" | "fixed_amount";
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
