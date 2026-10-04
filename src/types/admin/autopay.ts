export type ChargeAttemptStatus = "processing" | "succeeded" | "failed" | "skipped" | "requires_review";
export type ChargeAttemptSource = "autopay" | "admin";

export interface ChargeAttempt {
  id: string;
  source: ChargeAttemptSource;
  attempt_number: number;
  status: ChargeAttemptStatus;
  amount: number;
  card_label: string;
  stripe_payment_intent_id: string | null;
  failure_code: string | null;
  failure_message: string | null;
  next_retry_at: string | null;
  initiated_by_name: string | null;
  created_at: string | null;
  completed_at: string | null;
}

export interface AdminChargeAttempt extends ChargeAttempt {
  invoice: { id: string; unique_id: string; invoice_number: string; status: string } | null;
  user: { id: number; first_name: string; last_name: string; email: string } | null;
}

export interface AdminSavedCard {
  id: string;
  card_brand: string;
  last_four: string;
  expiry_month: string;
  expiry_year: string;
  cardholder_name: string | null;
  is_default: boolean;
  is_autopay_card: boolean;
}

export interface InvoiceSavedCardsResponse {
  payment_profiles: AdminSavedCard[];
  autopay: {
    is_enabled: boolean;
    card_label: string | null;
    max_amount: number | null;
    enabled_at: string | null;
    schedule: { charge_date: string | null; card_label: string; exceeds_limit: boolean } | null;
  };
  charge_attempts: ChargeAttempt[];
}

export interface AutopayEnrollment {
  id: string;
  user: { id: number; first_name: string; last_name: string; email: string } | null;
  is_enabled: boolean;
  card_label: string | null;
  max_amount: number | null;
  enabled_at: string | null;
  disabled_at: string | null;
  disabled_by_type: "client" | "admin" | "system" | null;
  disabled_by_name: string | null;
  disabled_reason: string | null;
  consent_ip: string | null;
}

export interface AutopayHealth {
  last_run_at: string | null;
  last_run_summary: { reconciled: number; charged: number; failed: number; skipped: number; pending: number } | null;
  scheduler_healthy: boolean;
  enrolled_clients: number;
  processing_count: number;
  requires_review: number;
  failed_last_30_days: number;
  succeeded_last_30_days: number;
  collected_last_30_days: number;
}

export interface ChargeAttemptFilters {
  page?: number;
  per_page?: number;
  status?: ChargeAttemptStatus | "";
  source?: ChargeAttemptSource | "";
  search?: string;
}

export interface PaginatedChargeAttempts {
  data: AdminChargeAttempt[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}
