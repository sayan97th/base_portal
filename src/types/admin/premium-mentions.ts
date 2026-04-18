export interface AdminPremiumMentionsPlan {
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
  sort_order: number;
  orders_count?: number;
  revenue_total?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreatePremiumMentionsPlanPayload {
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
  sort_order: number;
}

export type UpdatePremiumMentionsPlanPayload = Partial<CreatePremiumMentionsPlanPayload>;
