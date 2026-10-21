/**
 * Tests for the "site removed" alert of the admin Link Building Orders table:
 * an order still in progress whose partnership left the partner list is
 * highlighted so the writer picks a different site.
 */

import {
  LINK_BUILDING_ORDER_STATUSES,
  SITE_REMOVED_ALERT_STATUSES,
  isSiteRemovedAlert,
} from "@/lib/link-building-order-statuses";

function makeRow(overrides: Partial<{ status: string; current_poc: string; current_price: string }> = {}) {
  return {
    status: "New Request",
    current_poc: "David",
    current_price: "$20",
    ...overrides,
  };
}

describe("SITE_REMOVED_ALERT_STATUSES", () => {
  it("only contains preset statuses of the table", () => {
    SITE_REMOVED_ALERT_STATUSES.forEach((status) => {
      expect(LINK_BUILDING_ORDER_STATUSES).toContain(status);
    });
  });

  it("leaves out finished and closed orders", () => {
    ["Live", "Cancelled", "Not Approved", "Rejected", "Quality Control", "Scheduled"].forEach((status) => {
      expect(SITE_REMOVED_ALERT_STATUSES.has(status)).toBe(false);
    });
  });
});

describe("isSiteRemovedAlert", () => {
  it.each(["New Request", "Reviewing", "Ordered", "Pending", "Partnership Check", "Approved", "Ready"])(
    "flags a %s order whose Current Price is SITE REMOVED",
    (status) => {
      expect(isSiteRemovedAlert(makeRow({ status, current_price: "SITE REMOVED" }))).toBe(true);
    }
  );

  it("flags the row when only Current POC is SITE REMOVED", () => {
    expect(isSiteRemovedAlert(makeRow({ current_poc: "SITE REMOVED" }))).toBe(true);
  });

  it("matches the word regardless of casing, like the sheet's conditional format", () => {
    expect(isSiteRemovedAlert(makeRow({ current_price: "Site removed" }))).toBe(true);
  });

  it.each(["Live", "Cancelled", "Not Approved"])("does not flag a %s order", (status) => {
    expect(isSiteRemovedAlert(makeRow({ status, current_poc: "SITE REMOVED", current_price: "SITE REMOVED" }))).toBe(false);
  });

  it("does not flag an in progress order whose partnership is still listed", () => {
    expect(isSiteRemovedAlert(makeRow())).toBe(false);
  });

  it("does not flag empty metric cells", () => {
    expect(isSiteRemovedAlert(makeRow({ current_poc: "", current_price: "" }))).toBe(false);
  });

  it("does not throw when a metric value is missing", () => {
    const row = { status: "Pending", current_poc: undefined, current_price: null } as unknown as Parameters<typeof isSiteRemovedAlert>[0];
    expect(isSiteRemovedAlert(row)).toBe(false);
  });
});
