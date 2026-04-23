export interface ContentRefreshTier {
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

export interface CreateContentRefreshOrderPayload {
  tier_id: string;
  order_notes?: string | null;
  total_amount: number;
  coupon_ids?: string[];
  billing: {
    company?: string | null;
    address: string;
    city: string;
    state: string;
    country: string;
    postal_code: string;
  };
  payment: {
    payment_method_id: string;
  };
}

export interface CreateContentRefreshOrderResponse {
  order_id: string;
  status: string;
  total_amount: number;
  created_at: string;
}

export interface ContentRefreshTiersResponse {
  data: ContentRefreshTier[];
}
