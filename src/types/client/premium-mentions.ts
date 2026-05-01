export interface PremiumMentionsPlan {
  id: string;
  name: string;
  price_per_month: number;
  total_placements: number;
  exclusive_placements: number;
  core_placements: number;
  support_placements: number;
  best_for: string;
  tagline: string;
  is_most_popular: boolean;
  is_active: boolean;
}

export interface CreatePremiumMentionsOrderPayload {
  plan_id: string;
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

export interface CreatePremiumMentionsOrderResponse {
  order_id: string;
  status: string;
  total_amount: number;
  created_at: string;
}

export interface PremiumMentionsPlansResponse {
  data: PremiumMentionsPlan[];
}

export interface CreatePremiumMentionsAppointmentPayload {
  event_uri: string;
  invitee_uri: string;
  plan_id: string;
}

export interface PremiumMentionsAppointmentResponse {
  id: number;
  event_uri: string;
  invitee_uri: string;
  plan_id: string;
  scheduled_at: string;
  created_at: string;
}
