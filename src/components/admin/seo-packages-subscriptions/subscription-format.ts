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

// ── Billing schedule math (mirrors SeoPackageSubscription::advanceByOneMonth) ──

function parseIso(iso: string): { year: number; month: number; day: number } | null {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]) - 1, day: Number(match[3]) };
}

function toIso(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Same anchor day `months` months later, clamped to shorter months: a plan
 * anchored on the 31st bills Feb 28 and then Mar 31 again.
 */
export function addBillingMonths(iso: string, months: number, anchor_day?: number): string {
  const parts = parseIso(iso);
  if (!parts) return iso;
  const anchor = anchor_day ?? parts.day;
  const total = parts.year * 12 + parts.month + months;
  const year = Math.floor(total / 12);
  const month = ((total % 12) + 12) % 12;
  const days_in_month = new Date(year, month + 1, 0).getDate();
  return toIso(year, month, Math.min(anchor, days_in_month));
}

export function addCalendarDays(iso: string, days: number): string {
  const parts = parseIso(iso);
  if (!parts) return iso;
  const date = new Date(parts.year, parts.month, parts.day + days);
  return toIso(date.getFullYear(), date.getMonth(), date.getDate());
}

export function dayOfMonth(iso: string): number {
  return parseIso(iso)?.day ?? 1;
}

/**
 * First billing date when the current period is already paid: the start
 * date's next cycle, moved forward until it is today or later.
 */
export function nextCycleOnOrAfterToday(start_iso: string, today_iso: string): string {
  const anchor = dayOfMonth(start_iso);
  let months = 1;
  let candidate = addBillingMonths(start_iso, months, anchor);
  while (candidate < today_iso && months < 600) {
    months += 1;
    candidate = addBillingMonths(start_iso, months, anchor);
  }
  return candidate;
}

/** Last day covered by `payment_count` monthly payments starting on first_iso. */
export function endDateForPayments(first_iso: string, payment_count: number): string {
  return addCalendarDays(addBillingMonths(first_iso, payment_count, dayOfMonth(first_iso)), -1);
}

/** Charge dates starting at first_iso, stopping after ends_iso when set. */
export function buildChargeSchedule(first_iso: string, count: number, ends_iso?: string | null): string[] {
  const anchor = dayOfMonth(first_iso);
  const dates: string[] = [];
  for (let i = 0; i < count; i++) {
    const date = addBillingMonths(first_iso, i, anchor);
    if (ends_iso && date > ends_iso) break;
    dates.push(date);
  }
  return dates;
}
