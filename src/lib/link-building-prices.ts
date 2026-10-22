/**
 * Money columns of the Link Building Orders table. Prices are saved the way the
 * BASE link sheet shows them, "$1,250.00", with the symbol of the row's currency.
 * Kept in sync with LinkBuildingOrderPlacement::formatPrice() on the backend,
 * which formats every saved price the same way.
 */

import type { LinkBuildingOrderRow } from "@/types/admin/link-building-order";

/** Text columns that hold prices, see PRICE_COLUMNS on the backend. */
export const PRICE_COLUMN_KEYS: ReadonlySet<string> = new Set(["posting_fee_lbs", "current_price", "final_price"]);

const CURRENCY_SYMBOLS: Readonly<Record<string, string>> = { USD: "$", EUR: "€" };

const price_number_format = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Symbol a price of the given currency is shown with, "$" when the currency is unknown. */
export function getCurrencySymbol(currency: string | null | undefined): string {
  return CURRENCY_SYMBOLS[(currency ?? "").toUpperCase()] ?? "$";
}

/**
 * Price text with the currency symbol and two decimals: "150", "1250.5" or
 * "$1,250.5" become "$150.00" and "$1,250.50". Text that is not a plain amount
 * ("TBD", "$50 to $100", "10%") is returned as typed.
 */
export function formatPriceValue(value: string, currency: string | null | undefined): string {
  let text = value.trim();
  if (text === "") return value;

  let is_negative = false;
  if (text.startsWith("-") || text.startsWith("+")) {
    is_negative = text.startsWith("-");
    text = text.slice(1).trimStart();
  }

  text = text.replace(/^[$€£]\s*/, "");

  if (!is_negative && text.startsWith("-")) {
    is_negative = true;
    text = text.slice(1).trimStart();
  }

  // Thousands separators only count when they group digits by three.
  if (/^\d{1,3}(,\d{3})+(\.\d*)?$/.test(text)) text = text.replace(/,/g, "");
  if (!/^(\d+\.?\d*|\.\d+)$/.test(text)) return value;

  const amount = Math.round(Number(text) * 100) / 100;
  return `${is_negative && amount > 0 ? "-" : ""}${getCurrencySymbol(currency)}${price_number_format.format(amount)}`;
}

/**
 * The row with every price formatted for its currency. Returns the same row when
 * nothing changes, so React state updates stay cheap.
 */
export function withFormattedPrices(row: LinkBuildingOrderRow): LinkBuildingOrderRow {
  let next_row = row;
  PRICE_COLUMN_KEYS.forEach((key) => {
    const field = key as keyof LinkBuildingOrderRow;
    const value = row[field];
    if (typeof value !== "string") return;
    const formatted = formatPriceValue(value, row.currency);
    if (formatted !== value) next_row = { ...next_row, [field]: formatted };
  });
  return next_row;
}
