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
