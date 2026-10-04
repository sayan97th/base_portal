import type { Appearance } from "@stripe/stripe-js";

export const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

export function parseTotalCents(total: string): number | null {
  if (/credits/i.test(total)) return null;
  const cleaned = total.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const amount = parseFloat(cleaned);
  if (isNaN(amount)) return null;
  return Math.round(amount * 100);
}

const CARD_BRAND_LABELS: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  discover: "Discover",
  diners: "Diners Club",
  jcb: "JCB",
  unionpay: "UnionPay",
};

export function formatCardBrand(card_brand: string): string {
  return CARD_BRAND_LABELS[card_brand?.toLowerCase()] ?? (card_brand ? card_brand.charAt(0).toUpperCase() + card_brand.slice(1) : "Card");
}

export function formatCardLabel(card_brand: string, last_four: string): string {
  return `${formatCardBrand(card_brand)} •••• ${last_four}`;
}

export function isCardExpired(expiry_month: string, expiry_year: string): boolean {
  const month = parseInt(expiry_month, 10);
  let year = parseInt(expiry_year, 10);
  if (!month || !year) return false;
  if (year < 100) year += 2000;
  const now = new Date();
  return year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1);
}

export function getApiErrorMessage(error_response: unknown, fallback_message: string): string {
  const api_error = error_response as { message?: string } | null;
  return api_error?.message && api_error.message !== "Session expired" ? api_error.message : fallback_message;
}

export const STRIPE_APPEARANCE: Appearance = {
  theme: "stripe",
  variables: {
    colorPrimary: "#e91e8c",
    colorBackground: "#ffffff",
    colorText: "#111827",
    colorDanger: "#ef4444",
    fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
    borderRadius: "12px",
    spacingUnit: "4px",
  },
  rules: {
    ".Input": {
      border: "1px solid #e5e7eb",
      boxShadow: "none",
      padding: "12px 14px",
    },
    ".Input:focus": {
      border: "1px solid #e91e8c",
      boxShadow: "0 0 0 3px rgba(233,30,140,0.1)",
    },
    ".Label": {
      color: "#374151",
      fontSize: "14px",
      fontWeight: "500",
    },
  },
};
