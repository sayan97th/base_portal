import type { Coupon, CouponUsage, CouponUsageProductType } from "@/types/admin/coupons";
import { getCouponStatus, parseCouponDate, type CouponStatus } from "../list/coupon-list";

export type CouponUsageGroupBy = "product" | "client" | "status" | "month" | "none";
export type CouponUsageSort = "newest" | "oldest" | "discount" | "total";

export interface CouponUsageGroup {
  key: string;
  label: string;
  color: string;
  usages: CouponUsage[];
}

/** Board palette, one color per group so each group reads at a glance. */
const GROUP_PALETTE = [
  "#579bfc",
  "#00c875",
  "#a25ddc",
  "#fdab3d",
  "#ff158a",
  "#0086c0",
  "#9cd326",
  "#e2445c",
  "#66ccff",
  "#784bd1",
];

export const PRODUCT_COLORS: Record<CouponUsageProductType, string> = {
  link_building: "#579bfc",
  new_content: "#00c875",
  content_optimization: "#a25ddc",
  content_brief: "#fdab3d",
  premium_mentions: "#ff158a",
};

export const ORDER_STATUS_META: Record<string, { label: string; color: string }> = {
  new_request: { label: "New Request", color: "#579bfc" },
  pending: { label: "Pending", color: "#fdab3d" },
  pending_details: { label: "Pending Details", color: "#ffcb00" },
  payment_pending: { label: "Payment Pending", color: "#a25ddc" },
  processing: { label: "Processing", color: "#0086c0" },
  in_progress: { label: "In Progress", color: "#0086c0" },
  active: { label: "Active", color: "#0086c0" },
  completed: { label: "Completed", color: "#00c875" },
  cancelled: { label: "Cancelled", color: "#e2445c" },
  deleted: { label: "Order Deleted", color: "#7e7e8f" },
};

export const GROUP_BY_OPTIONS: { value: CouponUsageGroupBy; label: string }[] = [
  { value: "product", label: "Product" },
  { value: "client", label: "Client" },
  { value: "status", label: "Status" },
  { value: "month", label: "Month" },
  { value: "none", label: "None" },
];

export const SORT_OPTIONS: { value: CouponUsageSort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "discount", label: "Biggest discount" },
  { value: "total", label: "Highest total" },
];

const currency_formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

export function formatMoney(value: number | null | undefined): string {
  return currency_formatter.format(value ?? 0);
}

const COUPON_STATE_BADGES: Record<CouponStatus, { label: string; color: string }> = {
  active: { label: "Active", color: "#00c875" },
  scheduled: { label: "Scheduled", color: "#579bfc" },
  expired: { label: "Expired", color: "#e2445c" },
  disabled: { label: "Disabled", color: "#c4c4c4" },
};

/** Badge for the coupon header on the usage and gift card request pages. */
export function getCouponStateBadge(coupon: Coupon, now: Date = new Date()): { label: string; color: string } {
  return COUPON_STATE_BADGES[getCouponStatus(coupon, now)];
}

export function formatShortDate(value: string | null | undefined): string {
  if (!value) return "Not available";
  return parseCouponDate(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTime(value: string | null | undefined): string {
  if (!value) return "";
  return new Date(value).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function getStatusMeta(status: string): { label: string; color: string } {
  return (
    ORDER_STATUS_META[status] ?? {
      label: status
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" "),
      color: "#c4c4c4",
    }
  );
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0]?.slice(0, 2);
  return (initials ?? "?").toUpperCase();
}

/** Stable color for a string, so a client keeps the same avatar color everywhere. */
export function getColorForKey(key: string): string {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) | 0;
  }
  return GROUP_PALETTE[Math.abs(hash) % GROUP_PALETTE.length];
}

export function summarizeItems(usage: CouponUsage): string {
  if (usage.items.length === 0) return usage.product_label;
  if (usage.items.length === 1) {
    const [item] = usage.items;
    return `${item.quantity} x ${item.label}`;
  }
  return `${usage.items_quantity} items, ${usage.items.length} tiers`;
}

export function matchesSearch(usage: CouponUsage, search_term: string): boolean {
  const query = search_term.trim().toLowerCase();
  if (!query) return true;

  const haystack = [
    usage.order_reference,
    usage.order_id,
    usage.order_title,
    usage.product_label,
    getStatusMeta(usage.status).label,
    usage.client?.name,
    usage.client?.email,
    usage.client?.company,
    usage.client?.organization,
    usage.invoice?.invoice_number,
    ...usage.items.map((item) => item.label),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

export function sortUsages(usages: CouponUsage[], sort: CouponUsageSort): CouponUsage[] {
  const sorted = [...usages];
  const timeOf = (usage: CouponUsage) => (usage.used_at ? new Date(usage.used_at).getTime() : 0);

  sorted.sort((left, right) => {
    if (sort === "oldest") return timeOf(left) - timeOf(right);
    if (sort === "discount") {
      return right.discount_amount + right.reward_amount - (left.discount_amount + left.reward_amount);
    }
    if (sort === "total") return right.total_amount - left.total_amount;
    return timeOf(right) - timeOf(left);
  });

  return sorted;
}

export function groupUsages(usages: CouponUsage[], group_by: CouponUsageGroupBy): CouponUsageGroup[] {
  if (group_by === "none") {
    return [{ key: "all", label: "All orders", color: "#579bfc", usages }];
  }

  const groups = new Map<string, CouponUsageGroup>();

  for (const usage of usages) {
    let key: string;
    let label: string;
    let color: string;

    if (group_by === "product") {
      key = usage.product_type;
      label = usage.product_label;
      color = PRODUCT_COLORS[usage.product_type] ?? "#c4c4c4";
    } else if (group_by === "client") {
      key = usage.client ? String(usage.client.id ?? usage.client.email) : "unknown";
      label = usage.client?.name ?? "Unknown client";
      color = getColorForKey(key);
    } else if (group_by === "status") {
      const meta = getStatusMeta(usage.status);
      key = usage.status;
      label = meta.label;
      color = meta.color;
    } else {
      const date = usage.used_at ? new Date(usage.used_at) : null;
      key = date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` : "unknown";
      label = date
        ? date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
        : "Unknown date";
      color = getColorForKey(key);
    }

    const group = groups.get(key) ?? { key, label, color, usages: [] };
    group.usages.push(usage);
    groups.set(key, group);
  }

  const group_list = Array.from(groups.values());

  // Months read best newest first, every other grouping by its size.
  if (group_by === "month") {
    return group_list.sort((left, right) => right.key.localeCompare(left.key));
  }

  return group_list.sort((left, right) => right.usages.length - left.usages.length);
}

export function sumUsages(usages: CouponUsage[]) {
  return usages.reduce(
    (totals, usage) => ({
      subtotal: totals.subtotal + usage.subtotal_before_discount,
      discount: totals.discount + usage.discount_amount,
      reward: totals.reward + usage.reward_amount,
      total: totals.total + usage.total_amount,
    }),
    { subtotal: 0, discount: 0, reward: 0, total: 0 }
  );
}
