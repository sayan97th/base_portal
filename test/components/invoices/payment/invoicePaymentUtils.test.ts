import {
  formatCardExpiry,
  formatUsd,
  getApiErrorMessage,
  getApiErrorStatus,
  getCardBrandLabel,
  isPaymentProfileExpired,
  parseAmountToCents,
  pickPreferredPaymentProfile,
} from "@/components/invoices/payment/invoicePaymentUtils";
import type { PaymentProfile } from "@/types/client/payment-profile";

function makeProfile(overrides: Partial<PaymentProfile> = {}): PaymentProfile {
  return {
    id: "profile-1",
    stripe_payment_method_id: "pm_1",
    card_brand: "visa",
    last_four: "4242",
    expiry_month: "12",
    expiry_year: "2030",
    cardholder_name: null,
    billing_address: null,
    is_default: false,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

describe("parseAmountToCents", () => {
  it.each([
    ["$500.00", 50000],
    ["$1,250.50", 125050],
    ["$0.50", 50],
    ["$19.999", 2000],
  ])("parses %s to %i cents", (formatted_amount, expected_cents) => {
    expect(parseAmountToCents(formatted_amount)).toBe(expected_cents);
  });

  it.each(["120 credits", "1 Credits", "", "N/A"])("returns null for %p", (formatted_amount) => {
    expect(parseAmountToCents(formatted_amount)).toBeNull();
  });
});

describe("formatUsd", () => {
  it("formats cents as USD", () => {
    expect(formatUsd(125050)).toBe("$1,250.50");
    expect(formatUsd(0)).toBe("$0.00");
  });
});

describe("isPaymentProfileExpired", () => {
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 9, 15)); // Oct 15, 2026
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it("treats the current month as valid", () => {
    expect(isPaymentProfileExpired({ expiry_month: "10", expiry_year: "2026" })).toBe(false);
  });

  it("treats a previous month as expired", () => {
    expect(isPaymentProfileExpired({ expiry_month: "09", expiry_year: "2026" })).toBe(true);
  });

  it("treats a previous year as expired", () => {
    expect(isPaymentProfileExpired({ expiry_month: "12", expiry_year: "2025" })).toBe(true);
  });

  it("treats a future date as valid", () => {
    expect(isPaymentProfileExpired({ expiry_month: "1", expiry_year: "2027" })).toBe(false);
  });

  it("does not flag cards with unknown expiry", () => {
    expect(isPaymentProfileExpired({ expiry_month: "", expiry_year: "" })).toBe(false);
  });
});

describe("formatCardExpiry", () => {
  it("pads the month and shortens the year", () => {
    expect(formatCardExpiry({ expiry_month: "4", expiry_year: "2028" })).toBe("04/28");
  });
});

describe("getCardBrandLabel", () => {
  it.each([
    ["visa", "Visa"],
    ["MASTERCARD", "Mastercard"],
    ["amex", "American Express"],
    ["somebrand", "Somebrand"],
    [null, "Card"],
  ])("labels %p as %p", (card_brand, expected_label) => {
    expect(getCardBrandLabel(card_brand)).toBe(expected_label);
  });
});

describe("pickPreferredPaymentProfile", () => {
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 9, 15));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it("prefers the default card", () => {
    const default_profile = makeProfile({ id: "default", is_default: true });
    expect(pickPreferredPaymentProfile([makeProfile({ id: "other" }), default_profile])).toBe(default_profile);
  });

  it("skips an expired default card", () => {
    const usable_profile = makeProfile({ id: "usable" });
    const expired_default = makeProfile({ id: "expired", is_default: true, expiry_year: "2020" });
    expect(pickPreferredPaymentProfile([expired_default, usable_profile])).toBe(usable_profile);
  });

  it("returns null when every card is expired or there are none", () => {
    expect(pickPreferredPaymentProfile([makeProfile({ expiry_year: "2020" })])).toBeNull();
    expect(pickPreferredPaymentProfile([])).toBeNull();
  });
});

describe("API error helpers", () => {
  it("extracts the message and status from API errors", () => {
    const api_error = { message: "Invoice not found.", status_code: 404 };
    expect(getApiErrorMessage(api_error, "fallback")).toBe("Invoice not found.");
    expect(getApiErrorStatus(api_error)).toBe(404);
  });

  it("falls back for unknown error shapes", () => {
    expect(getApiErrorMessage(null, "fallback")).toBe("fallback");
    expect(getApiErrorMessage({ message: "  " }, "fallback")).toBe("fallback");
    expect(getApiErrorMessage(new Error("boom"), "fallback")).toBe("boom");
    expect(getApiErrorStatus("oops")).toBeNull();
    expect(getApiErrorStatus({ status_code: "500" })).toBeNull();
  });
});
