import type {
  AdminSeoSubscription,
  SeoSubscriptionChargeStatus,
} from "@/services/admin/seo-packages-subscription.service";

export function formatMoney(amount: number | null | undefined): string {
  return `$${Number(amount ?? 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Whole dollars when there are no cents, e.g. "$2,000" or "$1,499.50". */
export function formatMoneyCompact(amount: number | null | undefined): string {
  const value = Number(amount ?? 0);
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Formats "YYYY-MM-DD" or ISO strings. Date only values are read at noon so
 * the day never shifts in timezones behind UTC.
 */
export function formatDate(
  date_str: string | null | undefined,
  options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }
): string {
  if (!date_str) return "Not set";
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(date_str) ? `${date_str}T12:00:00` : date_str;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString("en-US", options);
}

export function todayIsoDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function monthName(date_str: string | null | undefined): string {
  if (!date_str) return "December";
  return formatDate(date_str, { month: "long" });
}

export function ordinal(day: number): string {
  const suffix =
    day % 100 >= 11 && day % 100 <= 13
      ? "th"
      : { 1: "st", 2: "nd", 3: "rd" }[day % 10] ?? "th";
  return `${day}${suffix}`;
}

export function cardBrandLabel(brand: string | null | undefined): string {
  const labels: Record<string, string> = {
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "Amex",
    discover: "Discover",
    jcb: "JCB",
    diners: "Diners",
    unionpay: "UnionPay",
  };
  if (!brand) return "Card";
  return labels[brand.toLowerCase()] ?? brand.charAt(0).toUpperCase() + brand.slice(1);
}

export function clientName(subscription: AdminSeoSubscription): string {
  const full = `${subscription.user.first_name ?? ""} ${subscription.user.last_name ?? ""}`.trim();
  return full || subscription.user.email;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export const CHARGE_STATUS_CONFIG: Record<
  SeoSubscriptionChargeStatus,
  { label: string; badge: string; dot: string }
> = {
  succeeded: {
    label: "Paid",
    badge: "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400",
    dot: "bg-success-500",
  },
  failed: {
    label: "Failed",
    badge: "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400",
    dot: "bg-error-500",
  },
  pending: {
    label: "Pending",
    badge: "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400",
    dot: "bg-warning-500",
  },
};

export const REMINDER_OPTIONS: { value: string; label: string }[] = [
  { value: "0", label: "No reminder" },
  { value: "1", label: "1 day before" },
  { value: "3", label: "3 days before (recommended)" },
  { value: "5", label: "5 days before" },
  { value: "7", label: "7 days before" },
];
