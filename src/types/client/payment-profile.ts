export interface PaymentProfile {
  id: string;
  stripe_payment_method_id: string;
  card_brand: string;
  last_four: string;
  expiry_month: string;
  expiry_year: string;
  cardholder_name: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentProfilePayload {
  stripe_payment_method_id: string;
  cardholder_name: string | null;
  is_default: boolean;
}

export interface PaymentProfileListResponse {
  data: PaymentProfile[];
}

export interface PaymentProfileResponse {
  data: PaymentProfile;
  message?: string;
}
