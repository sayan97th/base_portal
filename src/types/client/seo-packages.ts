export interface SeoPackageFeature {
  title: string;
  description: string;
}

export interface SeoPackage {
  id: string;
  name: string;
  headline: string;
  slug: string;
  price_per_month: number;
  best_for: string;
  ideal_for: string;
  is_most_popular: boolean;
  is_active: boolean;
  features: SeoPackageFeature[];
}

export interface SeoComparisonRow {
  id: string;
  label: string;
  values: Record<string, string | null>;
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

export type SeoSubscriptionPaymentState =
  | "healthy"
  | "no_payment_method"
  | "retrying"
  | "payment_pending"
  | "payment_failed"
  | "inactive";

/** Client facing payment health: plain language reason, no processor details. */
export interface SeoSubscriptionPaymentHealth {
  state: SeoSubscriptionPaymentState;
  severity: "ok" | "warning" | "critical";
  overdue_periods: number;
  overdue_amount: number;
  days_overdue: number;
  has_usable_card: boolean;
  card_issue: "missing" | "expired" | null;
  failure: {
    period_label: string;
    amount: number;
    reason: string;
    next_retry_at: string | null;
  } | null;
  open_invoice: {
    unique_id: string;
    invoice_number: string;
  } | null;
}

export interface ActiveSeoSubscription {
  id: number;
  package: ActiveSeoSubscriptionPackage | null;
  status: "active" | "cancelled" | "expired";
  starts_at: string;
  ends_at: string | null;
  created_at: string;
  plan_name: string;
  pricing_type: "package" | "custom";
  monthly_price: number;
  auto_renew: boolean;
  next_billing_date: string | null;
  payment_status?: "current" | "past_due";
  payment_health?: SeoSubscriptionPaymentHealth;
}
