import {
  exportGiftCardClaims,
  getOrderHref,
  getOrderReference,
  groupGiftCardClaimsByStatus,
  matchesGiftCardSearch,
  sortGiftCardClaims,
  sumGiftCardClaims,
} from "@/components/admin/coupons/gift-cards/gift-card-claims";
import { all_claims, ready_claim, sent_claim } from "./fixtures";

jest.mock("@/lib/exportCsv", () => ({ downloadCsv: jest.fn() }));
jest.mock("@/lib/exportSpreadsheet", () => ({ downloadXlsx: jest.fn().mockResolvedValue(undefined) }));

import { downloadCsv } from "@/lib/exportCsv";
import { downloadXlsx } from "@/lib/exportSpreadsheet";

const mockDownloadCsv = downloadCsv as jest.MockedFunction<typeof downloadCsv>;
const mockDownloadXlsx = downloadXlsx as jest.MockedFunction<typeof downloadXlsx>;

describe("gift card claim helpers", () => {
  it("builds the short order reference and the order link", () => {
    expect(getOrderReference(ready_claim)).toBe("ABCD1234");
    expect(getOrderHref(ready_claim)).toBe("/admin/orders/order-1");
    // A checkout with several orders opens the session page.
    expect(getOrderHref(sent_claim)).toBe(`/admin/orders/session/${sent_claim.session_id}`);
  });

  it("searches client, recipient email and order reference", () => {
    expect(matchesGiftCardSearch(ready_claim, "jane")).toBe(true);
    expect(matchesGiftCardSearch(ready_claim, "GIFTS@example")).toBe(true);
    expect(matchesGiftCardSearch(ready_claim, "abcd1234")).toBe(true);
    expect(matchesGiftCardSearch(ready_claim, "globex")).toBe(false);
    expect(matchesGiftCardSearch(ready_claim, "   ")).toBe(true);
  });

  it("sorts by date and by value", () => {
    expect(sortGiftCardClaims(all_claims, "newest").map((claim) => claim.id)).toEqual(["claim-1", "claim-3", "claim-2"]);
    expect(sortGiftCardClaims(all_claims, "oldest").map((claim) => claim.id)).toEqual(["claim-2", "claim-3", "claim-1"]);
    expect(sortGiftCardClaims(all_claims, "value_high").map((claim) => claim.id)).toEqual(["claim-1", "claim-3", "claim-2"]);
    expect(sortGiftCardClaims(all_claims, "value_low").map((claim) => claim.id)).toEqual(["claim-2", "claim-3", "claim-1"]);
  });

  it("groups by status in workflow order and skips empty statuses", () => {
    const groups = groupGiftCardClaimsByStatus([sent_claim, ready_claim]);
    expect(groups.map((group) => group.label)).toEqual(["Ready to send", "Sent"]);
    expect(groupGiftCardClaimsByStatus(all_claims).map((group) => group.key)).toEqual([
      "submitted",
      "pending_details",
      "fulfilled",
    ]);
  });

  it("sums gift card value, order value and the amount left to send", () => {
    expect(sumGiftCardClaims(all_claims)).toEqual({ reward: 160, order: 1600, to_send: 80 });
  });
});

describe("exportGiftCardClaims", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("exports a CSV with one row per request", async () => {
    await exportGiftCardClaims(all_claims, "HAPPYHOLIDAYS", "csv");

    expect(mockDownloadCsv).toHaveBeenCalledTimes(1);
    const [filename, headers, rows] = mockDownloadCsv.mock.calls[0];
    expect(filename).toMatch(/^happyholidays-gift-card-requests-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(headers).toContain("Send To");
    expect(rows).toHaveLength(3);

    const send_to_index = headers.indexOf("Send To");
    const status_index = headers.indexOf("Status");
    const sent_by_index = headers.indexOf("Sent By");
    expect(rows[0][send_to_index]).toBe("gifts@example.com");
    expect(rows[1][status_index]).toBe("Waiting for client");
    expect(rows[2][sent_by_index]).toBe("Abby Admin");
    // Every CSV cell is a string.
    rows.forEach((row) => row.forEach((cell) => expect(typeof cell).toBe("string")));
  });

  it("exports an Excel workbook with the requests and a summary sheet", async () => {
    await exportGiftCardClaims(all_claims, "HAPPYHOLIDAYS", "xlsx", "selected");

    expect(mockDownloadXlsx).toHaveBeenCalledTimes(1);
    const [filename, sheets] = mockDownloadXlsx.mock.calls[0];
    expect(filename).toMatch(/^happyholidays-gift-card-requests-selected-\d{4}-\d{2}-\d{2}\.xlsx$/);
    expect(sheets.map((sheet) => sheet.name)).toEqual(["Gift Card Requests", "Summary"]);

    const [header_row, first_row] = sheets[0].rows;
    // Money stays numeric so Excel can sum it.
    expect(first_row[header_row.indexOf("Gift Card Value")]).toBe(80);

    const summary_rows = sheets[1].rows;
    expect(summary_rows).toContainEqual(["Requests", 3]);
    expect(summary_rows).toContainEqual(["Ready to send", 1, 80]);
    expect(summary_rows).toContainEqual(["Sent", 1, 50]);
  });
});
