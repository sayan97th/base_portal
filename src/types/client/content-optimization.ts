export interface ContentOptimizationTier {
  id: string;
  label: string;
  word_count_range: string;
  turnaround_days: number;
  price: number;
  is_active: boolean;
  is_most_popular: boolean;
  max_quantity: number | null;
  is_hidden: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ContentOptimizationTiersResponse {
  data: ContentOptimizationTier[];
}

export interface ContentOptimizationOrderItem {
  tier_id: string;
  quantity: number;
  unit_price: number;
}

export interface ContentOptimizationOrderBilling {
  company?: string | null;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
}

export interface CreateContentOptimizationOrderPayload {
  order_notes?: string | null;
  total_amount: number;
  coupon_ids?: string[];
  items: ContentOptimizationOrderItem[];
  billing: ContentOptimizationOrderBilling;
  payment: {
    payment_method_id: string;
  };
}

export interface CreateContentOptimizationOrderResponse {
  order_id: string;
  status: string;
  total_amount: number;
  created_at: string;
}

export interface ContentOptimizationOrderSummary {
  id: string;
  order_notes: string | null;
  total_amount: number;
  status: string;
  created_at: string;
  items_count: number;
}

export interface ContentOptimizationOrderItemDetail {
  id: string;
  tier_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  tier: ContentOptimizationTier;
}

export interface ContentOptimizationOrderDetail {
  id: string;
  order_notes: string | null;
  total_amount: number;
  status: string;
  created_at: string;
  updated_at: string;
  items: ContentOptimizationOrderItemDetail[];
}
