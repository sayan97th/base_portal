export interface SeoPackageFeature {
  category: string;
  description: string;
}

export interface SeoPackage {
  id: string;
  name: string;
  slug: string;
  price_per_month: number;
  best_for: string;
  is_most_popular: boolean;
  is_active: boolean;
  features: SeoPackageFeature[];
}

export interface SeoSubscriptionBilling {
  company?: string | null;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
}

export interface CreateSeoSubscriptionPayload {
  package_id: string;
  total_amount: number;
  billing: SeoSubscriptionBilling;
  payment: {
    payment_method_id: string;
  };
}

export interface CreateSeoSubscriptionResponse {
  subscription_id: string;
  package_id: string;
  status: string;
  total_amount: number;
  created_at: string;
}
