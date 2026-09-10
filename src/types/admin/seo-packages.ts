export interface AdminSeoPackageFeature {
  title: string;
  description: string;
}

export interface AdminSeoPackage {
  id: string;
  name: string;
  headline: string;
  slug: string;
  price_per_month: number;
  best_for: string;
  ideal_for: string;
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
  headline: string;
  slug: string;
  price_per_month: number;
  best_for: string;
  ideal_for: string;
  is_most_popular: boolean;
  is_active: boolean;
  sort_order: number;
  features: AdminSeoPackageFeature[];
}

export type UpdateSeoPackagePayload = Partial<CreateSeoPackagePayload>;

export interface AdminSeoComparisonRow {
  id: string | null;
  label: string;
  sort_order: number;
  values: Record<string, string | null>;
}

export interface UpdateSeoComparisonPayload {
  rows: AdminSeoComparisonRow[];
}
