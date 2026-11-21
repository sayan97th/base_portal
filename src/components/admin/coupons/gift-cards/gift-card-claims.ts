import type { AdminGiftCardClaim, GiftCardClaimStatus } from "@/types/admin/coupons";
import { downloadCsv } from "@/lib/exportCsv";
import { downloadXlsx, type SpreadsheetCell } from "@/lib/exportSpreadsheet";

export type GiftCardBrand = NonNullable<AdminGiftCardClaim["gift_card_brand"]>;
export type GiftCardStatusFilter = "all" | GiftCardClaimStatus;
export type GiftCardSort = "newest" | "oldest" | "value_high" | "value_low";
export type GiftCardExportFormat = "csv" | "xlsx";

export interface GiftCardClaimGroup {
  key: string;
  label: string;
  color: string;
  claims: AdminGiftCardClaim[];
}

/** Board colors: grey while the client decides, orange to send, green once sent. */
export const GIFT_CARD_STATUS_META: Record<GiftCardClaimStatus, { label: string; color: string; hint: string }> = {
  submitted: {
    label: "Ready to send",
    color: "#fdab3d",
    hint: "The client chose a gift card. Send it and mark it as sent.",
  },
  pending_details: {
    label: "Waiting for client",
    color: "#c4c4c4",
    hint: "The client has not chosen a gift card yet.",
  },
  fulfilled: {
    label: "Sent",
    color: "#00c875",
    hint: "The gift card was sent to the client.",
  },
};

/** Status order used by filters, groups and the progress bar. */
export const GIFT_CARD_STATUS_ORDER: GiftCardClaimStatus[] = ["submitted", "pending_details", "fulfilled"];

export const GIFT_CARD_BRAND_META: Record<GiftCardBrand | "none", { label: string; color: string; text_color: string }> = {
  amazon: { label: "Amazon", color: "#232f3e", text_color: "#ff9900" },
  visa: { label: "Visa", color: "#1a1f71", text_color: "#f7b600" },
  target: { label: "Target", color: "#cc0000", text_color: "#ffffff" },
  none: { label: "Not chosen", color: "#e6e9ef", text_color: "#676879" },
};

export const GIFT_CARD_SORT_OPTIONS: { value: GiftCardSort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "value_high", label: "Highest value" },
  { value: "value_low", label: "Lowest value" },
];

// ── Small formatters ─────────────────────────────────────────────────────────

/** Short checkout reference, the same one shown on the order pages. */
export function getOrderReference(claim: AdminGiftCardClaim): string {
  return claim.session_id.slice(0, 8).toUpperCase();
}

/** A checkout with several products opens the session page, a single order opens the order. */
export function getOrderHref(claim: AdminGiftCardClaim): string {
  return claim.order_ids.length > 1 || claim.order_ids.length === 0
    ? `/admin/orders/session/${claim.session_id}`
    : `/admin/orders/${claim.order_ids[0]}`;
}

export function getBrandMeta(claim: AdminGiftCardClaim) {
  const brand_key = claim.gift_card_brand ?? "none";
  const meta = GIFT_CARD_BRAND_META[brand_key] ?? GIFT_CARD_BRAND_META.none;
  return { ...meta, label: claim.gift_card_brand_label ?? meta.label };
}

export function getSubmissionSourceLabel(claim: AdminGiftCardClaim): string {
  if (claim.submission_source === "checkout") return "At checkout";
  if (claim.submission_source === "order_page") return "From the order page";
  return "";
}

// ── Search, sorting and grouping ──────────────────────────────────────────

export function matchesGiftCardSearch(claim: AdminGiftCardClaim, search_term: string): boolean {
  const query = search_term.trim().toLowerCase();
  if (!query) return true;

  const haystack = [
    claim.client?.name,
    claim.client?.email,
    claim.client?.company,
    claim.recipient_email,
    claim.gift_card_brand_label,
    getOrderReference(claim),
    claim.session_id,
    ...claim.order_ids,
    GIFT_CARD_STATUS_META[claim.status].label,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

export function sortGiftCardClaims(claims: AdminGiftCardClaim[], sort: GiftCardSort): AdminGiftCardClaim[] {
  const timeOf = (claim: AdminGiftCardClaim) => (claim.created_at ? new Date(claim.created_at).getTime() : 0);

  return [...claims].sort((left, right) => {
    if (sort === "oldest") return timeOf(left) - timeOf(right);
    if (sort === "value_high") return right.reward_amount - left.reward_amount;
    if (sort === "value_low") return left.reward_amount - right.reward_amount;
    return timeOf(right) - timeOf(left);
  });
}

/** One group per status, always in workflow order so "Ready to send" stays on top. */
export function groupGiftCardClaimsByStatus(claims: AdminGiftCardClaim[]): GiftCardClaimGroup[] {
  return GIFT_CARD_STATUS_ORDER.map((status) => ({
    key: status,
    label: GIFT_CARD_STATUS_META[status].label,
    color: GIFT_CARD_STATUS_META[status].color,
    claims: claims.filter((claim) => claim.status === status),
  })).filter((group) => group.claims.length > 0);
}

export function sumGiftCardClaims(claims: AdminGiftCardClaim[]) {
  return claims.reduce(
    (totals, claim) => ({
      reward: totals.reward + claim.reward_amount,
      order: totals.order + claim.order_total,
      to_send: totals.to_send + (claim.status === "submitted" ? claim.reward_amount : 0),
    }),
    { reward: 0, order: 0, to_send: 0 }
  );
}

// ── Export ───────────────────────────────────────────────────────────────────

const EXPORT_HEADERS = [
  "Client",
  "Client Email",
  "Company",
  "Gift Card",
  "Gift Card Value",
  "Reward %",
  "Order Total",
  "Send To",
  "Status",
  "Submitted Via",
  "Submitted At",
  "Sent At",
  "Sent By",
  "Order Reference",
  "Order IDs",
  "Checkout Session",
  "Requested On",
];

const EXPORT_COLUMN_WIDTHS = [24, 30, 22, 12, 14, 10, 14, 30, 18, 20, 20, 20, 20, 16, 40, 38, 20];

function formatExportDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  // Sortable and readable in both Excel and plain CSV.
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function buildExportRows(claims: AdminGiftCardClaim[]): SpreadsheetCell[][] {
  return claims.map((claim) => [
    claim.client?.name ?? "Unknown client",
    claim.client?.email ?? "",
    claim.client?.company ?? "",
    claim.gift_card_brand_label ?? "Not chosen",
    Number(claim.reward_amount.toFixed(2)),
    claim.reward_percentage,
    Number(claim.order_total.toFixed(2)),
    claim.recipient_email ?? "",
    GIFT_CARD_STATUS_META[claim.status].label,
    getSubmissionSourceLabel(claim),
    formatExportDate(claim.submitted_at),
    formatExportDate(claim.fulfilled_at),
    claim.fulfilled_by?.name ?? "",
    `#${getOrderReference(claim)}`,
    claim.order_ids.join(", "),
    claim.session_id,
    formatExportDate(claim.created_at),
  ]);
}

function buildSummaryRows(coupon_code: string, claims: AdminGiftCardClaim[]): SpreadsheetCell[][] {
  const totals = sumGiftCardClaims(claims);
  const rows: SpreadsheetCell[][] = [
    ["Coupon", coupon_code],
    ["Exported at", formatExportDate(new Date().toISOString())],
    ["Requests", claims.length],
    ["Gift card value", Number(totals.reward.toFixed(2))],
    ["Order value", Number(totals.order.toFixed(2))],
    [],
    ["Status", "Requests", "Gift card value"],
  ];

  GIFT_CARD_STATUS_ORDER.forEach((status) => {
    const status_claims = claims.filter((claim) => claim.status === status);
    rows.push([
      GIFT_CARD_STATUS_META[status].label,
      status_claims.length,
      Number(sumGiftCardClaims(status_claims).reward.toFixed(2)),
    ]);
  });

  return rows;
}

/**
 * Downloads gift card requests as CSV or Excel. The Excel file also gets a
 * "Summary" sheet with the totals per status.
 */
export async function exportGiftCardClaims(
  claims: AdminGiftCardClaim[],
  coupon_code: string,
  format: GiftCardExportFormat,
  file_suffix = ""
): Promise<void> {
  const date_stamp = new Date().toISOString().slice(0, 10);
  const base_name = `${coupon_code.toLowerCase()}-gift-card-requests${file_suffix ? `-${file_suffix}` : ""}-${date_stamp}`;
  const rows = buildExportRows(claims);

  if (format === "csv") {
    downloadCsv(
      `${base_name}.csv`,
      EXPORT_HEADERS,
      rows.map((row) => row.map((cell) => (cell === null ? "" : String(cell))))
    );
    return;
  }

  await downloadXlsx(`${base_name}.xlsx`, [
    { name: "Gift Card Requests", rows: [EXPORT_HEADERS, ...rows], column_widths: EXPORT_COLUMN_WIDTHS },
    { name: "Summary", rows: buildSummaryRows(coupon_code, claims), column_widths: [20, 22, 18] },
  ]);
}
