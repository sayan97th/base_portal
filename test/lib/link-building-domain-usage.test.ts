/**
 * Tests for the "recent domain usage" alert of the admin Link Building Orders
 * table: a Partnership already used for the same landing page in the last months
 * is highlighted in red so the writer picks a different site.
 */

import {
  describeRecentDomainUsageRule,
  getRecentDomainUsageAlert,
  recentDomainUsageByRowId,
  withRecentDomainUsage,
} from "@/lib/link-building-domain-usage";
import type { LinkBuildingRecentDomainUsage } from "@/types/admin/link-building-order";

function makeUsage(overrides: Partial<LinkBuildingRecentDomainUsage> = {}): LinkBuildingRecentDomainUsage {
  return {
    count: 1,
    last_order_id: "BL-100",
    last_request_date: "09/10/2026",
    window_months: 3,
    ...overrides,
  };
}

describe("getRecentDomainUsageAlert", () => {
  it("returns null when the row has no recent usage", () => {
    expect(getRecentDomainUsageAlert({ partnership: "techkaya.com" })).toBeNull();
    expect(getRecentDomainUsageAlert({ partnership: "techkaya.com", recent_domain_usage: null })).toBeNull();
  });

  it("returns null when the partnership was cleared", () => {
    expect(getRecentDomainUsageAlert({ partnership: " ", recent_domain_usage: makeUsage() })).toBeNull();
  });

  it("names the earlier order when the domain was used once", () => {
    expect(getRecentDomainUsageAlert({ partnership: "techkaya.com", recent_domain_usage: makeUsage() })).toBe(
      "This domain was already used for this landing page in the last 3 months (BL-100, requested 09/10/2026). Choose a different site."
    );
  });

  it("counts every use and names the most recent one", () => {
    const alert = getRecentDomainUsageAlert({
      partnership: "techkaya.com",
      recent_domain_usage: makeUsage({ count: 2, last_order_id: "BL-200" }),
    });

    expect(alert).toBe(
      "This domain was already used 2 times for this landing page in the last 3 months, most recently BL-200, requested 09/10/2026. Choose a different site."
    );
  });

  it("never uses em dashes", () => {
    const alert = getRecentDomainUsageAlert({ partnership: "techkaya.com", recent_domain_usage: makeUsage({ count: 3 }) });
    expect(alert).not.toContain("—");
  });
});

describe("recentDomainUsageByRowId and withRecentDomainUsage", () => {
  it("merges the flag of rows the server returned and keeps the others", () => {
    const usage_by_row_id = recentDomainUsageByRowId([
      { id: "flagged", recent_domain_usage: makeUsage() },
      { id: "cleared", recent_domain_usage: null },
    ]);

    expect(withRecentDomainUsage(usage_by_row_id, "flagged")).toEqual({ recent_domain_usage: makeUsage() });
    expect(withRecentDomainUsage(usage_by_row_id, "cleared")).toEqual({ recent_domain_usage: null });
    expect(withRecentDomainUsage(usage_by_row_id, "not-returned")).toEqual({});
  });

  it("handles a response without rows", () => {
    expect(withRecentDomainUsage(recentDomainUsageByRowId(undefined), "any")).toEqual({});
  });
});

describe("describeRecentDomainUsageRule", () => {
  it("explains the window and the statuses that are not counted", () => {
    expect(describeRecentDomainUsageRule(3)).toBe(
      "Shown when another order used the same domain for the same landing page within 3 months before this row's Request Date. Cancelled, Rejected and Not Approved orders are not counted."
    );
  });

  it("uses the singular for a one month window", () => {
    expect(describeRecentDomainUsageRule(1)).toContain("within 1 month before");
  });
});
