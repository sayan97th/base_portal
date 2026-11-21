import type { Coupon } from "@/types/admin/coupons";

// Helpers for the admin coupons board. Kept free of React so they are easy to test.

export type CouponStatus = "active" | "scheduled" | "expired" | "disabled";
export type StatusFilter = "all" | CouponStatus;
export type CouponSort = "newest" | "expiring" | "most_used" | "code";

export interface CouponGroup {
  key: CouponStatus;
  label: string;
  color: string;
  coupons: Coupon[];
}

/**
 * Status colors come from the site theme tokens (success, blue light, error, gray),
 * with hex fallbacks because Tailwind only emits the variables that classes use.
 */
export const STATUS_META: Record<CouponStatus, { label: string; color: string; hint: string }> = {
  active: { label: "Active", color: "var(--color-success-500, #12b76a)", hint: "Live and redeemable" },
  scheduled: { label: "Scheduled", color: "var(--color-blue-light-500, #0ba5ec)", hint: "Starts in the future" },
  expired: { label: "Expired", color: "var(--color-error-500, #f04438)", hint: "Past its end date" },
  disabled: { label: "Disabled", color: "var(--color-gray-400, #98a2b3)", hint: "Paused by an admin" },
};

export const EXPIRING_SOON_DAYS = 7;

export const STATUS_ORDER: CouponStatus[] = ["active", "scheduled", "expired", "disabled"];

export const SORT_OPTIONS: { key: CouponSort; label: string }[] = [
  { key: "newest", label: "Newest first" },
  { key: "expiring", label: "Expiring soon" },
  { key: "most_used", label: "Most used" },
  { key: "code", label: "Code A to Z" },
];

const CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Parses a coupon date. Calendar dates (Y-m-d) are read as local days instead of
 * UTC midnight, so "2026-12-18" never shows up as December 17. Use "end" for an
 * expiry date, since the whole last day is part of the promotion.
 */
export function parseCouponDate(date_str: string, boundary: "start" | "end" = "start"): Date {
  const match = CALENDAR_DATE_PATTERN.exec(date_str);
  if (!match) return new Date(date_str);

  const [, year, month, day] = match.map(Number);
  return boundary === "end"
    ? new Date(year, month - 1, day, 23, 59, 59, 999)
    : new Date(year, month - 1, day, 0, 0, 0, 0);
}

type CouponWindowFields = Pick<Coupon, "is_active" | "starts_at" | "expires_at"> &
  Partial<Pick<Coupon, "active_from" | "active_until">>;

/**
 * Coupon status. Prefers the exact moments sent by the API (active_from and
 * active_until) and falls back to the calendar days, both days included.
 */
export function getCouponStatus(coupon: CouponWindowFields, now: Date = new Date()): CouponStatus {
  if (!coupon.is_active) return "disabled";

  const ends_at = coupon.active_until
    ? new Date(coupon.active_until)
    : coupon.expires_at
      ? parseCouponDate(coupon.expires_at, "end")
      : null;
  const starts_at = coupon.active_from
    ? new Date(coupon.active_from)
    : coupon.starts_at
      ? parseCouponDate(coupon.starts_at, "start")
      : null;

  if (ends_at && ends_at < now) return "expired";
  if (starts_at && starts_at > now) return "scheduled";
  return "active";
}

export function formatDiscount(coupon: Coupon): string {
  if (coupon.discount_type === "gift_card_reward") return `${coupon.discount_value}% back`;
  if (coupon.discount_type === "percentage") return `${coupon.discount_value}% off`;
  const amount = coupon.discount_value.toLocaleString("en-US", {
    minimumFractionDigits: coupon.discount_value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `$${amount} off`;
}

export function getDiscountTypeLabel(coupon: Coupon): string {
  if (coupon.discount_type === "gift_card_reward") return "Gift card";
  if (coupon.discount_type === "percentage") return "Percentage";
  return "Fixed amount";
}

export function getAppliesToLabel(coupon: Coupon): string {
  if (coupon.applies_to === "specific_product") {
    const tiers = coupon.dr_tiers ?? [];
    if (tiers.length === 0) return "Specific tier";
    if (tiers.length === 1) return tiers[0].label;
    return `${tiers.length} DR tiers`;
  }
  if (coupon.applies_to === "minimum_purchase") {
    const amount = coupon.minimum_purchase_amount?.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });
    return `Orders over ${amount ?? "N/A"}`;
  }
  return "All products";
}

/** Full tier list for the tooltip when the label is shortened. */
export function getAppliesToTitle(coupon: Coupon): string | undefined {
  const tiers = coupon.dr_tiers ?? [];
  if (coupon.applies_to !== "specific_product" || tiers.length < 2) return undefined;
  return tiers.map((tier) => tier.label).join(", ");
}

export function formatShortDate(date_str: string): string {
  return parseCouponDate(date_str).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function daysUntil(date_str: string | null, now: Date = new Date()): number | null {
  if (!date_str) return null;
  const diff_ms = parseCouponDate(date_str, "end").getTime() - now.getTime();
  return Math.ceil(diff_ms / (1000 * 60 * 60 * 24));
}

export function getUsagePercent(coupon: Coupon): number | null {
  if (!coupon.usage_limit) return null;
  return Math.min((coupon.times_used / coupon.usage_limit) * 100, 100);
}

export function matchesSearch(coupon: Coupon, search_query: string): boolean {
  const query = search_query.trim().toLowerCase();
  if (!query) return true;
  return (
    coupon.code.toLowerCase().includes(query) ||
    coupon.name.toLowerCase().includes(query) ||
    (coupon.description?.toLowerCase().includes(query) ?? false)
  );
}

export function sortCoupons(coupons: Coupon[], sort: CouponSort): Coupon[] {
  const sorted = [...coupons];
  switch (sort) {
    case "expiring":
      return sorted.sort((a, b) => {
        if (!a.expires_at) return 1;
        if (!b.expires_at) return -1;
        return new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime();
      });
    case "most_used":
      return sorted.sort((a, b) => b.times_used - a.times_used);
    case "code":
      return sorted.sort((a, b) => a.code.localeCompare(b.code));
    case "newest":
    default:
      return sorted.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }
}

export function groupCouponsByStatus(coupons: Coupon[], now: Date = new Date()): CouponGroup[] {
  const buckets: Record<CouponStatus, Coupon[]> = {
    active: [],
    scheduled: [],
    expired: [],
    disabled: [],
  };
  coupons.forEach((coupon) => buckets[getCouponStatus(coupon, now)].push(coupon));

  return STATUS_ORDER.filter((key) => buckets[key].length > 0).map((key) => ({
    key,
    label: STATUS_META[key].label,
    color: STATUS_META[key].color,
    coupons: buckets[key],
  }));
}

/** Active coupons that end within the next `days` days. */
export function countExpiringSoon(
  coupons: Coupon[],
  days: number = EXPIRING_SOON_DAYS,
  now: Date = new Date()
): number {
  return coupons.filter((coupon) => {
    if (getCouponStatus(coupon, now) !== "active") return false;
    const days_left = daysUntil(coupon.expires_at, now);
    return days_left !== null && days_left <= days;
  }).length;
}

export function sumRedemptions(coupons: Coupon[]): number {
  return coupons.reduce((total, coupon) => total + coupon.times_used, 0);
}
