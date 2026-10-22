/**
 * Unit tests for the price formatting of the admin Link Building Orders table:
 * prices get the currency symbol of their row automatically, like the BASE link
 * sheet. The same cases run against LinkBuildingOrderPlacement::formatPrice().
 */

import { formatPriceValue, getCurrencySymbol, withFormattedPrices } from "@/lib/link-building-prices";
import type { LinkBuildingOrderRow } from "@/types/admin/link-building-order";

describe("getCurrencySymbol", () => {
  it("maps the dashboard currencies to their symbols", () => {
    expect(getCurrencySymbol("USD")).toBe("$");
    expect(getCurrencySymbol("EUR")).toBe("€");
    expect(getCurrencySymbol("eur")).toBe("€");
  });

  it("falls back to the dollar sign", () => {
    expect(getCurrencySymbol("")).toBe("$");
    expect(getCurrencySymbol(null)).toBe("$");
    expect(getCurrencySymbol(undefined)).toBe("$");
  });
});

describe("formatPriceValue", () => {
  it.each([
    ["150", "USD", "$150.00"],
    ["1250.5", "USD", "$1,250.50"],
    ["$1,250.00", "USD", "$1,250.00"],
    ["$50", "USD", "$50.00"],
    ["12.345", "USD", "$12.35"],
    [".5", "USD", "$0.50"],
    ["  75  ", "USD", "$75.00"],
    ["-$20", "USD", "-$20.00"],
    ["$-20", "USD", "-$20.00"],
    ["99", "EUR", "€99.00"],
    ["$99", "EUR", "€99.00"],
    ["0", "USD", "$0.00"],
  ])("formats %p in %s as %p", (value, currency, expected) => {
    expect(formatPriceValue(value, currency)).toBe(expected);
  });

  it.each(["", "   ", "TBD", "$50 to $100", "10%", "1,25", "1.2.3"])("keeps %p as typed", (value) => {
    expect(formatPriceValue(value, "USD")).toBe(value);
  });
});

describe("withFormattedPrices", () => {
  const buildRow = (overrides: Partial<LinkBuildingOrderRow>): LinkBuildingOrderRow =>
    ({
      id: "row-1",
      posting_fee_lbs: "",
      current_price: "",
      final_price: "",
      currency: "USD",
      keyword: "1500",
      ...overrides,
    }) as LinkBuildingOrderRow;

  it("formats every price of the row for its currency", () => {
    const row = withFormattedPrices(buildRow({ posting_fee_lbs: "50", current_price: "$1200", final_price: "1380.5", currency: "EUR" }));
    expect(row.posting_fee_lbs).toBe("€50.00");
    expect(row.current_price).toBe("€1,200.00");
    expect(row.final_price).toBe("€1,380.50");
  });

  it("leaves the columns that are not prices alone", () => {
    expect(withFormattedPrices(buildRow({ final_price: "10" })).keyword).toBe("1500");
  });

  it("returns the same row when nothing changes", () => {
    const row = buildRow({ final_price: "$10.00", current_price: "TBD" });
    expect(withFormattedPrices(row)).toBe(row);
  });
});
