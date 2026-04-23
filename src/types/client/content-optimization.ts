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
