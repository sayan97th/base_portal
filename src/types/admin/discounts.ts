export type DiscountType = "bulk";
export type DiscountAppliesTo =
  | "link_building"
  | "new_content"
  | "content_optimization"
  | "content_brief"
  | "all";

export interface DiscountDrTier {
  id: string;
  label: string;
  price_per_link: number;
  is_active: boolean;
}

export interface Discount {
  id: string;
  name: string;
  description: string | null;
  discount_type: DiscountType;
  discount_rate: number;
  min_quantity: number;
  applies_to: DiscountAppliesTo;
  is_active: boolean;
  dr_tier_ids: string[];
  dr_tiers: DiscountDrTier[];
  created_at: string;
  updated_at: string;
}

export interface BulkDiscountDetail {
  config: Discount;
  is_applied: boolean;
  discount_amount: number;
  current_quantity: number;
  quantity_needed: number;
  product_subtotal: number;
}

export interface CreateDiscountPayload {
  name: string;
  description?: string | null;
  discount_type: DiscountType;
  discount_rate: number;
  min_quantity: number;
  applies_to: DiscountAppliesTo;
  is_active: boolean;
  dr_tier_ids?: string[];
}

export type UpdateDiscountPayload = Partial<CreateDiscountPayload>;
