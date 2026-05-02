export type CartProductType =
  | "content_optimization"
  | "link_building"
  | "new_content"
  | "content_brief";

export interface CartKeywordRow {
  keyword: string;
  landing_page: string;
  exact_match: boolean;
}

export interface CartIntakeRow {
  keyword_phrase: string;
  type_of_content: string;
  notes: string;
}

export interface CartItem {
  cart_item_id: string;
  product_type: CartProductType;
  tier_id: string;
  tier_name: string;
  quantity: number;
  unit_price: number;
  keyword_data?: CartKeywordRow[];
  /** One inner array per quantity unit; each inner array holds that instance's rows. */
  intake_data?: CartIntakeRow[][];
}

export interface CartAppliedCoupon {
  coupon_id: string;
  code: string;
  coupon_name: string;
  discount_amount: number;
  discount_type: string;
  discount_value: number;
}

export interface UnifiedCartPayload {
  items: CartItem[];
  applied_coupons: CartAppliedCoupon[];
  coupon_input_code: string;
  order_title: string;
  order_notes: string;
}

export interface UnifiedCheckoutPlacement {
  row_index: number;
  keyword: string | null;
  landing_page: string | null;
  exact_match: boolean;
}

export interface UnifiedCheckoutLinkBuildingItem {
  dr_tier_id: string;
  quantity: number;
  unit_price: number;
  placements: UnifiedCheckoutPlacement[];
}

export interface UnifiedCheckoutGenericItem {
  tier_id: string;
  quantity: number;
  unit_price: number;
}

export interface UnifiedCheckoutNewContentItem {
  tier_id: string;
  quantity: number;
  unit_price: number;
  intake_rows?: CartIntakeRow[];
}

export interface UnifiedCheckoutBilling {
  company: string | null;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
}

export interface UnifiedCheckoutPayload {
  payment_method_id: string;
  total_amount: number;
  coupon_ids?: string[] | null;
  billing: UnifiedCheckoutBilling;
  order_title?: string | null;
  order_notes?: string | null;
  link_building_items?: UnifiedCheckoutLinkBuildingItem[];
  content_optimization_items?: UnifiedCheckoutGenericItem[];
  new_content_items?: UnifiedCheckoutNewContentItem[];
  content_brief_items?: UnifiedCheckoutGenericItem[];
}

export interface UnifiedCheckoutCreatedOrder {
  product_type: CartProductType;
  order_id: string;
  total_amount: number;
}

export interface UnifiedCheckoutResponse {
  orders: UnifiedCheckoutCreatedOrder[];
}
