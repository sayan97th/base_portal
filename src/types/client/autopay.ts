export type AutopayChargeStatus = "processing" | "succeeded" | "failed" | "skipped" | "requires_review";

export interface AutopayCardSummary {
  id: string;
  card_brand: string;
  last_four: string;
  expiry_month: string;
  expiry_year: string;
}

export interface AutopayRecentCharge {
  id: string;
  invoice_number: string | null;
  invoice_unique_id: string | null;
  amount: number;
  status: AutopayChargeStatus;
  card_label: string;
  failure_message: string | null;
  next_retry_at: string | null;
  created_at: string | null;
}

export interface AutopaySettings {
  is_enabled: boolean;
  payment_profile_id: string | null;
  payment_profile: AutopayCardSummary | null;
  max_amount: number | null;
  enabled_at: string | null;
  disabled_at: string | null;
  disabled_by_type: "client" | "admin" | "system" | null;
  disabled_reason: string | null;
  consent_text: string;
  max_attempts: number;
  recent_charges: AutopayRecentCharge[];
}

export interface UpdateAutopayPayload {
  payment_profile_id: string;
  max_amount: number | null;
  consent_accepted: boolean;
}

export interface AutopaySettingsResponse {
  data: AutopaySettings;
  message?: string;
}
