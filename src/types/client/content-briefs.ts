export interface ContentBriefTier {
  id: string;
  label: string;
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

export interface ContentBriefTiersResponse {
  data: ContentBriefTier[];
}

export interface ContentBriefOrderItem {
  tier_id: string;
  quantity: number;
  unit_price: number;
}

export interface ContentBriefOrderBilling {
  company?: string | null;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
}

export interface CreateContentBriefOrderPayload {
  total_amount: number;
  coupon_ids?: string[];
  items: ContentBriefOrderItem[];
  billing: ContentBriefOrderBilling;
  payment: {
    payment_method_id: string;
  };
}

export interface CreateContentBriefOrderResponse {
  order_id: string;
  status: string;
  total_amount: number;
  created_at: string;
}

export interface ContentBriefOrderSummary {
  id: string;
  order_notes: string | null;
  total_amount: number;
  status: string;
  created_at: string;
  items_count: number;
}
