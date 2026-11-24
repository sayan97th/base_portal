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
  /**
   * Promotions never stack by default: when false, any promo code applied at
   * checkout removes this discount. When true, it stays next to money back
   * promo codes (gift card rewards). Price discount promo codes always replace it.
   */
  allow_promo_code_stacking: boolean;
  is_active: boolean;
  dr_tier_ids: string[];
  dr_tiers: DiscountDrTier[];
  created_at: string;
  updated_at: string;
}

export interface BulkDiscountDetail {
  config: Discount;
  /** The cart meets the minimum quantity of this discount. */
  is_eligible: boolean;
  /** An applied promo code removes this discount (promotions never stack). */
  is_blocked_by_promo_code: boolean;
  /** Eligible and not blocked by a promo code: the discount lowers the total. */
  is_applied: boolean;
  /** Savings the discount would give if it were applied, used for notices. */
  eligible_discount_amount: number;
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
  allow_promo_code_stacking: boolean;
  is_active: boolean;
  dr_tier_ids?: string[];
}

export type UpdateDiscountPayload = Partial<CreateDiscountPayload>;
