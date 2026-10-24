/**
 * Tests for the helpers that describe the Link Building Orders version history:
 * action summaries, field labels and how recorded values read.
 */

import {
  describeBatch,
  describeSkip,
  formatHistoryValue,
  historyDayLabel,
  historyFieldLabel,
  isBatchRestorable,
  isRevisionRestorable,
} from "@/lib/link-building-history";
import type { LinkBuildingHistoryBatch, LinkBuildingOrderRevision } from "@/types/admin/link-building-order-history";

function makeBatch(overrides: Partial<LinkBuildingHistoryBatch> = {}): LinkBuildingHistoryBatch {
  return {
    batch_id: "batch-1",
    source: "paste",
    user: { id: 1, name: "Krista B" },
    started_at: "2026-10-23T15:00:00+00:00",
    revisions_count: 2,
    rows_count: 2,
    created_count: 0,
    updated_count: 2,
    deleted_count: 0,
    cells_count: 8,
    restored_batch_id: null,
    restored: null,
    revisions: [],
    has_more_revisions: false,
    ...overrides,
  };
}

describe("describeBatch", () => {
  it("counts the cells and rows a paste changed", () => {
    expect(describeBatch(makeBatch())).toBe("8 cells in 2 rows");
  });

  it("leaves the row count out for a single row", () => {
    expect(describeBatch(makeBatch({ rows_count: 1, updated_count: 1, cells_count: 1 }))).toBe("1 cell");
  });

  it("counts row changes when the action is larger than its preview", () => {
    expect(describeBatch(makeBatch({ cells_count: null, updated_count: 1200, rows_count: 1200 }))).toBe(
      "1,200 row changes in 1,200 rows"
    );
  });

  it("describes added and deleted rows", () => {
    expect(describeBatch(makeBatch({ updated_count: 0, deleted_count: 3, rows_count: 3 }))).toBe("3 rows deleted");
    expect(describeBatch(makeBatch({ updated_count: 0, created_count: 1, rows_count: 1 }))).toBe("1 row added");
  });
});

describe("formatHistoryValue", () => {
  it("shows blanks, booleans and formulas in words", () => {
    expect(formatHistoryValue(null)).toBe("(empty)");
    expect(formatHistoryValue("")).toBe("(empty)");
    expect(formatHistoryValue(true)).toBe("Yes");
    expect(formatHistoryValue(false)).toBe("No");
    expect(formatHistoryValue({ final_price: "=[posting_fee_lbs:~0]*2" })).toBe("final_price: =[posting_fee_lbs:~0]*2");
    expect(formatHistoryValue("https://www.getweave.com/fatigue-icd-10/")).toBe("https://www.getweave.com/fatigue-icd-10/");
  });
});

describe("historyFieldLabel", () => {
  it("uses the grid header, then a known name, then a readable column name", () => {
    expect(historyFieldLabel("client", { client: "Company" })).toBe("Company");
    expect(historyFieldLabel("assigned_admin_user_id", {})).toBe("Assigned To");
    expect(historyFieldLabel("some_new_column", {})).toBe("Some new column");
  });
});

describe("restorability", () => {
  it("restores changes and deletions, never additions", () => {
    expect(isBatchRestorable(makeBatch())).toBe(true);
    expect(isBatchRestorable(makeBatch({ updated_count: 0, created_count: 2 }))).toBe(false);
    expect(isRevisionRestorable({ event: "deleted" } as LinkBuildingOrderRevision)).toBe(true);
    expect(isRevisionRestorable({ event: "created" } as LinkBuildingOrderRevision)).toBe(false);
  });
});

describe("historyDayLabel", () => {
  const now = new Date(2026, 9, 24, 12, 0);

  it("names today and yesterday, and dates older days", () => {
    expect(historyDayLabel(new Date(2026, 9, 24, 8, 0).toISOString(), now)).toBe("Today");
    expect(historyDayLabel(new Date(2026, 9, 23, 22, 0).toISOString(), now)).toBe("Yesterday");
    expect(historyDayLabel(new Date(2026, 9, 15, 9, 0).toISOString(), now)).toBe("Thursday, October 15");
  });
});

describe("describeSkip", () => {
  it("explains why a row was left out of a restore", () => {
    expect(
      describeSkip({ placement_id: "p1", order_id: "BL-25687", field: "order_id", reason: "order_id_in_use" }, {})
    ).toBe("BL-25687: its Order ID is now used by another row, so it was not restored.");
    expect(
      describeSkip({ placement_id: "p1", order_id: "BL-1", field: "keyword", reason: "row_deleted" }, { keyword: "Keyword" })
    ).toBe("BL-1: the row was deleted, so Keyword could not be restored.");
  });
});
