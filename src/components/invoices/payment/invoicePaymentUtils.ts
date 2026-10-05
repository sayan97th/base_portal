import type { PaymentProfile } from "@/types/client/payment-profile";

/** Stripe's minimum USD charge, in cents. */
export const MINIMUM_CHARGE_CENTS = 50;

/**
 * Converts an API-formatted invoice total ("$1,250.00") to cents.
 * Returns null for credit-denominated totals ("120 credits") or unparsable values.
 */
export function parseAmountToCents(formatted_amount: string): number | null {
  if (/credits/i.test(formatted_amount)) return null;

  const numeric_value = formatted_amount.replace(/[^0-9.]/g, "");
  if (!numeric_value) return null;

  const amount = parseFloat(numeric_value);
  if (Number.isNaN(amount)) return null;

  return Math.round(amount * 100);
}

export function formatUsd(amount_cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount_cents / 100);
}

export function isPaymentProfileExpired(payment_profile: Pick<PaymentProfile, "expiry_month" | "expiry_year">): boolean {
  const expiry_month = parseInt(payment_profile.expiry_month, 10);
  const expiry_year = parseInt(payment_profile.expiry_year, 10);

  if (!expiry_month || !expiry_year) return false;

  const now = new Date();
  const current_year = now.getFullYear();
  const current_month = now.getMonth() + 1;

  return expiry_year < current_year || (expiry_year === current_year && expiry_month < current_month);
}

export function formatCardExpiry(payment_profile: Pick<PaymentProfile, "expiry_month" | "expiry_year">): string {
  return `${payment_profile.expiry_month.padStart(2, "0")}/${payment_profile.expiry_year.slice(-2)}`;
}

const CARD_BRAND_LABELS: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  american_express: "American Express",
  discover: "Discover",
  diners: "Diners Club",
  jcb: "JCB",
  unionpay: "UnionPay",
};

export function getCardBrandLabel(card_brand: string | null | undefined): string {
  if (!card_brand) return "Card";
  return CARD_BRAND_LABELS[card_brand.toLowerCase()] ?? card_brand.charAt(0).toUpperCase() + card_brand.slice(1);
}

/**
 * Picks the card to preselect: the default card when usable, otherwise the
 * most recent non-expired card. Returns null when no saved card can be used.
 */
export function pickPreferredPaymentProfile(payment_profiles: PaymentProfile[]): PaymentProfile | null {
  const usable_profiles = payment_profiles.filter((payment_profile) => !isPaymentProfileExpired(payment_profile));
  return usable_profiles.find((payment_profile) => payment_profile.is_default) ?? usable_profiles[0] ?? null;
}

export function getApiErrorMessage(error_response: unknown, fallback_message: string): string {
  if (error_response && typeof error_response === "object" && "message" in error_response) {
    const error_message = (error_response as { message?: unknown }).message;
    if (typeof error_message === "string" && error_message.trim() !== "") return error_message;
  }
  return fallback_message;
}

export function getApiErrorStatus(error_response: unknown): number | null {
  if (error_response && typeof error_response === "object" && "status_code" in error_response) {
    const status_code = (error_response as { status_code?: unknown }).status_code;
    return typeof status_code === "number" ? status_code : null;
  }
  return null;
}
