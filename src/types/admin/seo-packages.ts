export interface AdminSeoPackageFeature {
  category: string;
  description: string;
}

export interface AdminSeoPackage {
  id: string;
  name: string;
  slug: string;
  price_per_month: number;
  best_for: string;
  tagline: string;
  is_most_popular: boolean;
  is_active: boolean;
  sort_order: number;
  features: AdminSeoPackageFeature[];
  orders_count?: number;
  revenue_total?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateSeoPackagePayload {
  name: string;
  slug: string;
  price_per_month: number;
  best_for: string;
  tagline: string;
  is_most_popular: boolean;
  is_active: boolean;
  sort_order: number;
  features: AdminSeoPackageFeature[];
}

export type UpdateSeoPackagePayload = Partial<CreateSeoPackagePayload>;
