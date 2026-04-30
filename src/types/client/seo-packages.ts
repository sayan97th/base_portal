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

export interface CreateSeoAppointmentPayload {
  event_uri: string;
  invitee_uri: string;
  package_id: string;
}

export interface SeoAppointmentResponse {
  id: number;
  event_uri: string;
  invitee_uri: string;
  package_id: string;
  scheduled_at: string;
  created_at: string;
}

export interface ActiveSeoSubscriptionPackage {
  id: string;
  name: string;
  slug: string;
  price_per_month: number;
}

export interface ActiveSeoSubscription {
  id: number;
  package: ActiveSeoSubscriptionPackage;
  status: "active" | "cancelled" | "expired";
  starts_at: string;
  ends_at: string | null;
  created_at: string;
}
