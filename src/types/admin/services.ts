export type ServiceStatus = "active" | "inactive";
export type ServiceCategory = "link_building" | "content" | "seo" | "other";
export type PricingModel = "tiered" | "fixed" | "per_unit" | "subscription" | "custom";

export interface AdminDrTier {
  id: string;
  dr_label: string;
  traffic_range: string;
  word_count: number;
  price_per_link: number;
  is_most_popular: boolean;
  is_active: boolean;
  is_hidden: boolean;
  orders_count: number;
  revenue_total: number;
  created_at: string;
  updated_at: string;
}

export interface DrTierPurchase {
  order_id: string;
  user: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  quantity: number;
  subtotal: number;
  purchased_at: string;
}

export interface AdminDrTierDetail extends AdminDrTier {
  unique_buyers: number;
  purchases: DrTierPurchase[];
}

export interface AdminService {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: ServiceCategory;
  pricing_model: PricingModel;
  base_price: number | null;
  is_active: boolean;
  is_featured: boolean;
  orders_count: number;
  revenue_total: number;
  dr_tiers?: AdminDrTier[];
  created_at: string;
  updated_at: string;
}

export interface CreateServicePayload {
  name: string;
  description: string;
  category: ServiceCategory;
  pricing_model: PricingModel;
  base_price: number | null;
  is_active: boolean;
  is_featured: boolean;
}

export type UpdateServicePayload = Partial<CreateServicePayload>;

export interface CreateDrTierPayload {
  dr_label: string;
  traffic_range: string;
  word_count: number;
  price_per_link: number;
  is_most_popular: boolean;
  is_active: boolean;
}

export type UpdateDrTierPayload = Partial<CreateDrTierPayload>;

export interface ServiceStats {
  total_services: number;
  active_services: number;
  inactive_services: number;
  total_dr_tiers: number;
  active_dr_tiers: number;
}
