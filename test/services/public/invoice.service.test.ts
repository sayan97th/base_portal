import { getPublicInvoice } from "@/services/public/invoice.service";
import type { InvoiceDetail } from "@/components/invoices/invoiceData";

// ─── Fetch mock ───────────────────────────────────────────────────────────────

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockFetchResponse(status: number, body: unknown): void {
  mockFetch.mockResolvedValueOnce({
    ok:   status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  });
}

function makeInvoiceDetail(overrides: Partial<InvoiceDetail> = {}): InvoiceDetail {
  return {
    invoice_number: "BSM-1234",
    unique_id:      "ABC123",
    date_issued:    "Jun 1, 2026",
    date_paid:      null,
    date_due:       "Jun 30, 2026",
    payment_method: "Credit Card",
    status:         "unpaid",
    subtotal:       "$500.00",
    total:          "$500.00",
    credit:         "$0.00",
    billed_to:      null,
    line_items:     [
      {
        item_name:    "Link Building Package",
        price:        "$500.00",
        quantity:     1,
        item_total:   "$500.00",
        product_type: "link_building",
      },
    ],
    ...overrides,
  };
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe("getPublicInvoice", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Success cases ──────────────────────────────────────────────────────

  it("returns InvoiceDetail when response is wrapped in data key", async () => {
    const detail = makeInvoiceDetail();
    mockFetchResponse(200, { data: detail });

    const result = await getPublicInvoice("ABC123", "valid-token");

    expect(result).toEqual(detail);
  });

  it("returns InvoiceDetail when response is the object directly", async () => {
    const detail = makeInvoiceDetail();
    mockFetchResponse(200, detail);

    const result = await getPublicInvoice("ABC123", "valid-token");

    expect(result).toEqual(detail);
  });

  it("calls fetch with the correct URL including encoded invoice_id and token", async () => {
    const detail = makeInvoiceDetail();
    mockFetchResponse(200, { data: detail });

    await getPublicInvoice("ABC 123", "my token");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("ABC%20123"),
      expect.any(Object)
    );
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("token=my%20token"),
      expect.any(Object)
    );
  });

  it("calls fetch with JSON Accept and Content-Type headers", async () => {
    const detail = makeInvoiceDetail();
    mockFetchResponse(200, { data: detail });

    await getPublicInvoice("ABC123", "valid-token");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept:         "application/json",
          "Content-Type": "application/json",
        }),
      })
    );
  });

  // ─── Error cases ────────────────────────────────────────────────────────

  it("throws an object with status_code 401 when token is missing", async () => {
    mockFetchResponse(401, { message: "Token is required." });

    await expect(getPublicInvoice("ABC123", "")).rejects.toMatchObject({
      status_code: 401,
      message:     "Token is required.",
    });
  });

  it("throws an object with status_code 403 when token is wrong", async () => {
    mockFetchResponse(403, { message: "Access denied." });

    await expect(getPublicInvoice("ABC123", "bad-token")).rejects.toMatchObject({
      status_code: 403,
    });
  });

  it("throws an object with status_code 404 when invoice does not exist", async () => {
    mockFetchResponse(404, { message: "Invoice not found." });

    await expect(getPublicInvoice("NOPE", "some-token")).rejects.toMatchObject({
      status_code: 404,
    });
  });

  it("throws a fallback error when JSON parsing fails on error response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok:     false,
      status: 500,
      json:   jest.fn().mockRejectedValue(new Error("invalid json")),
    });

    await expect(getPublicInvoice("ABC123", "token")).rejects.toMatchObject({
      status_code: 500,
      message:     "An unexpected error occurred",
    });
  });

  // ─── URL construction ───────────────────────────────────────────────────

  it("builds the URL using NEXT_PUBLIC_API_BASE_URL when defined", async () => {
    const original = process.env.NEXT_PUBLIC_API_BASE_URL;
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.example.com";

    // API_BASE_URL is captured at module-load time, so re-import the module
    // in isolation after overriding the env var to pick up the new value.
    let getPublicInvoiceReloaded: typeof getPublicInvoice;
    jest.isolateModules(() => {
      getPublicInvoiceReloaded =
        require("@/services/public/invoice.service").getPublicInvoice;
    });

    const detail = makeInvoiceDetail();
    mockFetchResponse(200, { data: detail });

    await getPublicInvoiceReloaded!("ABC123", "valid-token");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("https://api.example.com"),
      expect.any(Object)
    );

    process.env.NEXT_PUBLIC_API_BASE_URL = original;
  });
});
