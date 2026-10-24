import type { LinkBuildingRecentDomainUsage } from "@/types/admin/link-building-order";

/**
 * Explanation shown on a Partnership cell highlighted in red because the same
 * domain was already used for the row's landing page in the last months (see
 * LinkBuildingDomainUsageService in the API). Null when the domain is free to use.
 */
export function getRecentDomainUsageAlert(row: {
  partnership: string;
  recent_domain_usage?: LinkBuildingRecentDomainUsage | null;
}): string | null {
  const usage = row.recent_domain_usage;
  if (!usage || usage.count <= 0 || !row.partnership?.trim()) return null;

  const window_label = usage.window_months === 1 ? "month" : `${usage.window_months} months`;
  const last_use = `${usage.last_order_id}, requested ${usage.last_request_date}`;
  const summary =
    usage.count === 1
      ? `This domain was already used for this landing page in the last ${window_label} (${last_use}).`
      : `This domain was already used ${usage.count} times for this landing page in the last ${window_label}, most recently ${last_use}.`;

  return `${summary} Choose a different site.`;
}

type RecentDomainUsageByRowId = Map<string, LinkBuildingRecentDomainUsage | null | undefined>;

/** Recent domain usage of each row returned by a batch update, keyed by row id. */
export function recentDomainUsageByRowId(
  rows: ReadonlyArray<{ id: string; recent_domain_usage?: LinkBuildingRecentDomainUsage | null }> | undefined
): RecentDomainUsageByRowId {
  return new Map((rows ?? []).map((row) => [row.id, row.recent_domain_usage ?? null]));
}

/**
 * The recent_domain_usage field to merge into a row after a batch update, or no
 * field at all when the server did not return that row, so its flag is kept.
 */
export function withRecentDomainUsage(
  usage_by_row_id: RecentDomainUsageByRowId,
  row_id: string
): { recent_domain_usage?: LinkBuildingRecentDomainUsage | null } {
  return usage_by_row_id.has(row_id) ? { recent_domain_usage: usage_by_row_id.get(row_id) ?? null } : {};
}
