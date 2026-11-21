import type {
  Coupon,
  CouponUsage,
  CouponUsageCheckout,
  CouponUsageClient,
  CouponUsageProductType,
} from "@/types/admin/coupons";
import { getCouponStatus, parseCouponDate, type CouponStatus } from "../list/coupon-list";

/** "checkout" shows every order bought together, "product" one row per discounted product order. */
export type CouponUsageView = "checkout" | "product";
export type CouponUsageGroupBy = "product" | "client" | "status" | "month" | "none";
export type CouponUsageSort = "newest" | "oldest" | "discount" | "total";

interface GroupMeta {
  key: string;
  label: string;
  color: string;
}

export interface CouponUsageGroup extends GroupMeta {
  usages: CouponUsage[];
}

export interface CouponCheckoutGroup extends GroupMeta {
  checkouts: CouponUsageCheckout[];
}

export interface CsvExport {
  headers: string[];
  rows: string[][];
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

export const PRODUCT_LABELS: Record<CouponUsageProductType, string> = {
  link_building: "Link Building",
  new_content: "New Content",
  content_optimization: "Content Optimization",
  content_brief: "Content Briefs",
  premium_mentions: "Premium Mentions",
};

/** Status the API sends for a checkout whose orders are in different statuses. */
export const MIXED_STATUS = "mixed";

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
  [MIXED_STATUS]: { label: "Mixed statuses", color: "#9d99b9" },
};

export const VIEW_OPTIONS: { value: CouponUsageView; label: string }[] = [
  { value: "checkout", label: "Checkouts" },
  { value: "product", label: "Product orders" },
];

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

export const GIFT_CARD_STATUS_LABELS: Record<string, string> = {
  pending_details: "Waiting for client details",
  submitted: "Ready to send",
  fulfilled: "Gift card sent",
};

/** Coupon terms saved at checkout, so later coupon edits never rewrite history. */
export function formatCouponTerms(coupon_terms: CouponUsage["coupon_terms"]): string {
  const { discount_type, discount_value } = coupon_terms;
  if (discount_type === "fixed_amount") return `${formatMoney(discount_value)} off`;
  if (discount_type === "gift_card_reward") return `${discount_value}% back`;
  return `${discount_value}% off`;
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

function getProductColor(product_type: CouponUsageProductType): string {
  return PRODUCT_COLORS[product_type] ?? "#c4c4c4";
}

function getClientKey(client: CouponUsageClient | null): string {
  return client ? String(client.id ?? client.email) : "unknown";
}

/** Group key, label and color shared by both views for client, status and month. */
function resolveSharedGroupMeta(
  group_by: Exclude<CouponUsageGroupBy, "product" | "none">,
  record: { client: CouponUsageClient | null; status: string; used_at: string | null }
): GroupMeta {
  if (group_by === "client") {
    const key = getClientKey(record.client);
    return { key, label: record.client?.name ?? "Unknown client", color: getColorForKey(key) };
  }

  if (group_by === "status") {
    const meta = getStatusMeta(record.status);
    return { key: record.status, label: meta.label, color: meta.color };
  }

  const date = record.used_at ? new Date(record.used_at) : null;
  const key = date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` : "unknown";
  return {
    key,
    label: date ? date.toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "Unknown date",
    color: getColorForKey(key),
  };
}

function buildGroups<T>(
  records: T[],
  group_by: CouponUsageGroupBy,
  resolveMeta: (record: T) => GroupMeta
): (GroupMeta & { records: T[] })[] {
  const groups = new Map<string, GroupMeta & { records: T[] }>();

  for (const record of records) {
    const meta = resolveMeta(record);
    const group = groups.get(meta.key) ?? { ...meta, records: [] };
    group.records.push(record);
    groups.set(meta.key, group);
  }

  const group_list = Array.from(groups.values());

  // Months read best newest first, every other grouping by its size.
  if (group_by === "month") {
    return group_list.sort((left, right) => right.key.localeCompare(left.key));
  }

  return group_list.sort((left, right) => right.records.length - left.records.length);
}

export function groupUsages(usages: CouponUsage[], group_by: CouponUsageGroupBy): CouponUsageGroup[] {
  if (group_by === "none") {
    return [{ key: "all", label: "All orders", color: "#579bfc", usages }];
  }

  return buildGroups(usages, group_by, (usage) =>
    group_by === "product"
      ? { key: usage.product_type, label: usage.product_label, color: getProductColor(usage.product_type) }
      : resolveSharedGroupMeta(group_by, usage)
  ).map(({ records, ...meta }) => ({ ...meta, usages: records }));
}

export function sumUsages(usages: { subtotal_before_discount: number; discount_amount: number; reward_amount: number; total_amount: number }[]) {
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

// ── Checkouts ────────────────────────────────────────────────────────────────

export function getProductLabel(product_type: CouponUsageProductType): string {
  return PRODUCT_LABELS[product_type] ?? product_type.replace(/_/g, " ");
}

/** Products the coupon discounted in a checkout, for example "Link Building + New Content". */
export function describeAppliedProducts(checkout: CouponUsageCheckout): string {
  return checkout.applied_product_types.map(getProductLabel).join(" + ");
}

export function summarizeCheckoutItems(checkout: CouponUsageCheckout): string {
  const items = checkout.orders.flatMap((order) => order.items);
  if (items.length === 1) return `${items[0].quantity} x ${items[0].label}`;

  const item_text = `${checkout.items_quantity} ${checkout.items_quantity === 1 ? "item" : "items"}`;
  if (checkout.order_count === 1) return item_text;
  return `${item_text} in ${checkout.order_count} products`;
}

export function checkoutIncludesProduct(
  checkout: CouponUsageCheckout,
  product_type: CouponUsageProductType | "all"
): boolean {
  return product_type === "all" || checkout.product_types.includes(product_type);
}

export function matchesCheckoutSearch(checkout: CouponUsageCheckout, search_term: string): boolean {
  const query = search_term.trim().toLowerCase();
  if (!query) return true;

  const haystack = [
    checkout.reference,
    checkout.session_id,
    checkout.title,
    getStatusMeta(checkout.status).label,
    checkout.client?.name,
    checkout.client?.email,
    checkout.client?.company,
    checkout.client?.organization,
    ...checkout.invoices.map((invoice) => invoice.invoice_number),
    ...checkout.orders.flatMap((order) => [
      order.order_reference,
      order.order_id,
      order.order_title,
      order.product_label,
      getStatusMeta(order.status).label,
      ...order.items.map((item) => item.label),
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

export function sortCheckouts(checkouts: CouponUsageCheckout[], sort: CouponUsageSort): CouponUsageCheckout[] {
  const sorted = [...checkouts];
  const timeOf = (checkout: CouponUsageCheckout) => (checkout.used_at ? new Date(checkout.used_at).getTime() : 0);

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

export function groupCheckouts(checkouts: CouponUsageCheckout[], group_by: CouponUsageGroupBy): CouponCheckoutGroup[] {
  if (group_by === "none") {
    return [{ key: "all", label: "All checkouts", color: "#579bfc", checkouts }];
  }

  return buildGroups(checkouts, group_by, (checkout) => {
    if (group_by !== "product") return resolveSharedGroupMeta(group_by, checkout);

    // Grouped by the products the coupon discounted, so promo mixes read at a glance.
    const product_types = [...checkout.applied_product_types].sort();
    const key = product_types.join("+") || "none";
    return {
      key,
      label: product_types.map(getProductLabel).join(" + ") || "No discounted product",
      color: product_types.length === 1 ? getProductColor(product_types[0]) : getColorForKey(key),
    };
  }).map(({ records, ...meta }) => ({ ...meta, checkouts: records }));
}

/** How many listed rows include each product, for the product filter chips. */
export function countByProduct(
  records: { product_types: CouponUsageProductType[] }[]
): Map<CouponUsageProductType, number> {
  const counts = new Map<CouponUsageProductType, number>();
  for (const record of records) {
    for (const product_type of record.product_types) {
      counts.set(product_type, (counts.get(product_type) ?? 0) + 1);
    }
  }
  return counts;
}

// ── CSV export ───────────────────────────────────────────────────────────────

export function buildProductOrderExport(usages: CouponUsage[], is_gift_card_reward: boolean): CsvExport {
  return {
    headers: [
      "Order",
      "Order ID",
      "Checkout",
      "Product",
      "Status",
      "Client",
      "Client Email",
      "Company",
      "Items",
      "Subtotal",
      is_gift_card_reward ? "Gift Card Earned" : "Discount",
      "Total",
      "Invoice",
      "Used On",
    ],
    rows: usages.map((usage) => [
      usage.order_reference,
      usage.order_id,
      usage.session_id ?? "",
      usage.product_label,
      getStatusMeta(usage.status).label,
      usage.client?.name ?? "",
      usage.client?.email ?? "",
      usage.client?.company ?? usage.client?.organization ?? "",
      usage.items.map((item) => `${item.quantity} x ${item.label}`).join("; "),
      usage.subtotal_before_discount.toFixed(2),
      (is_gift_card_reward ? usage.reward_amount : usage.discount_amount).toFixed(2),
      usage.total_amount.toFixed(2),
      usage.invoice?.invoice_number ?? "",
      usage.used_at ? new Date(usage.used_at).toISOString() : "",
    ]),
  };
}

/** One row per purchased item, so the file shows every product of each checkout and which got the promo. */
export function buildCheckoutExport(checkouts: CouponUsageCheckout[], is_gift_card_reward: boolean): CsvExport {
  const savings_header = is_gift_card_reward ? "Item Gift Card Share" : "Item Discount";

  return {
    headers: [
      "Checkout",
      "Session ID",
      "Client",
      "Client Email",
      "Company",
      "Order",
      "Product",
      "Order Status",
      "Item",
      "Qty",
      "Unit Price",
      "Item Subtotal",
      "Promo Applied",
      savings_header,
      "Checkout Subtotal",
      is_gift_card_reward ? "Checkout Gift Card" : "Checkout Discount",
      "Checkout Total",
      "Invoices",
      "Used On",
    ],
    rows: checkouts.flatMap((checkout) =>
      checkout.orders.flatMap((order) =>
        order.items.map((item) => {
          const item_savings = is_gift_card_reward ? item.reward_amount : item.discount_amount;
          return [
            checkout.reference,
            checkout.session_id ?? "",
            checkout.client?.name ?? "",
            checkout.client?.email ?? "",
            checkout.client?.company ?? checkout.client?.organization ?? "",
            order.order_reference,
            order.product_label,
            getStatusMeta(order.status).label,
            item.label,
            String(item.quantity),
            item.unit_price.toFixed(2),
            item.subtotal.toFixed(2),
            item.is_coupon_applied ? "Yes" : "No",
            item_savings === null ? "" : item_savings.toFixed(2),
            checkout.subtotal_before_discount.toFixed(2),
            (is_gift_card_reward ? checkout.reward_amount : checkout.discount_amount).toFixed(2),
            checkout.total_amount.toFixed(2),
            checkout.invoices.map((invoice) => invoice.invoice_number ?? invoice.id).join("; "),
            checkout.used_at ? new Date(checkout.used_at).toISOString() : "",
          ];
        })
      )
    ),
  };
}
