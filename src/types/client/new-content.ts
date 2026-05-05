export interface NewContentTier {
  id: string;
  label: string;
  turnaround_time: string;
  price: number;
  is_active: boolean;
  is_most_popular: boolean;
  max_quantity: number | null;
  is_hidden: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface NewContentTiersResponse {
  data: NewContentTier[];
}

export interface NewContentOrderItem {
  tier_id: string;
  quantity: number;
  unit_price: number;
}

export interface NewContentOrderBilling {
  company?: string | null;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
}

export interface CreateNewContentOrderPayload {
  order_notes?: string | null;
  total_amount: number;
  coupon_ids?: string[];
  items: NewContentOrderItem[];
  billing: NewContentOrderBilling;
  payment: {
    payment_method_id: string;
  };
}

export interface CreateNewContentOrderResponse {
  order_id: string;
  status: string;
  total_amount: number;
  created_at: string;
}

export interface NewContentOrderSummary {
  id: string;
  order_notes: string | null;
  total_amount: number;
  status: string;
  created_at: string;
  items_count: number;
}

export interface NewContentOrdersResponse {
  data: NewContentOrderSummary[];
}

export interface NewContentIntakeRow {
  keyword_phrase: string;
  type_of_content: string;
  notes: string;
}

export interface NewContentOrderItemDetail {
  id: string;
  tier_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  tier: NewContentTier;
  intake_rows?: NewContentIntakeRow[];
}

export interface NewContentOrderDetail {
  id: string;
  order_title?: string | null;
  order_notes: string | null;
  total_amount: number;
  status: string;
  created_at: string;
  updated_at: string;
  items: NewContentOrderItemDetail[];
}

