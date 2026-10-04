import {
  createInvoicePaymentIntent,
  confirmInvoicePayment,
} from "@/services/public/invoice-payment.service";

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

// ─── createInvoicePaymentIntent ───────────────────────────────────────────────

describe("createInvoicePaymentIntent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls the Laravel payment-intent endpoint for the invoice", async () => {
    mockFetchResponse(200, { client_secret: "pi_secret_abc", payment_intent_id: "pi_abc", amount_cents: 50000 });

    await createInvoicePaymentIntent("UNIQUE123", "tok-abc");

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/invoices\/UNIQUE123\/payment-intent$/);
  });

  it("sends only the share token — never an amount", async () => {
    mockFetchResponse(200, { client_secret: "pi_secret_abc", payment_intent_id: "pi_abc", amount_cents: 75000 });

    await createInvoicePaymentIntent("INV-XYZ", "token-123");

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string);

    expect(body).toEqual({ token: "token-123" });
  });

  it("uses POST method", async () => {
    mockFetchResponse(200, { client_secret: "pi_secret", payment_intent_id: "pi_id", amount_cents: 100 });

    await createInvoicePaymentIntent("INV-1", "tok");

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(options.method).toBe("POST");
  });

  it("URL-encodes the invoice id", async () => {
    mockFetchResponse(200, { client_secret: "pi_secret", payment_intent_id: "pi_id", amount_cents: 100 });

    await createInvoicePaymentIntent("ABC 123", "tok");

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("ABC%20123");
  });

  it("returns client_secret, payment_intent_id and amount_cents on success", async () => {
    const expected = { client_secret: "pi_secret_xyz", payment_intent_id: "pi_xyz", amount_cents: 10000 };
    mockFetchResponse(200, expected);

    const result = await createInvoicePaymentIntent("INV-1", "tok");

    expect(result).toEqual(expected);
  });

  it("rejects with the API message and status code when the response is not ok", async () => {
    mockFetchResponse(403, { message: "Access denied." });

    await expect(createInvoicePaymentIntent("INV-1", "tok")).rejects.toMatchObject({
      message: "Access denied.",
      status_code: 403,
    });
  });

  it("rejects with a fallback message when the error has no message", async () => {
    mockFetchResponse(500, {});

    await expect(createInvoicePaymentIntent("INV-1", "tok")).rejects.toMatchObject({
      message: "Failed to initialize payment.",
      status_code: 500,
    });
  });
});

// ─── confirmInvoicePayment ────────────────────────────────────────────────────

describe("confirmInvoicePayment", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls the correct backend URL with encoded invoice_id", async () => {
    mockFetchResponse(200, { message: "Payment confirmed successfully." });

    await confirmInvoicePayment("ABC 123", "token", "pi_test");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("ABC%20123"),
      expect.any(Object)
    );
  });

  it("uses POST method", async () => {
    mockFetchResponse(200, { message: "Payment confirmed successfully." });

    await confirmInvoicePayment("ABC123", "tok", "pi_test");

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(options.method).toBe("POST");
  });

  it("sends payment_intent_id and token in the request body", async () => {
    mockFetchResponse(200, { message: "Payment confirmed." });

    await confirmInvoicePayment("ABC123", "mytoken", "pi_intent_xyz");

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string);

    expect(body.payment_intent_id).toBe("pi_intent_xyz");
    expect(body.token).toBe("mytoken");
  });

  it("sends JSON Content-Type and Accept headers", async () => {
    mockFetchResponse(200, { message: "Payment confirmed." });

    await confirmInvoicePayment("ABC123", "tok", "pi_test");

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((options.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    expect((options.headers as Record<string, string>)["Accept"]).toBe("application/json");
  });

  it("resolves without throwing on 200 response", async () => {
    mockFetchResponse(200, { message: "Payment confirmed." });

    await expect(confirmInvoicePayment("ABC123", "tok", "pi_test")).resolves.toBeUndefined();
  });

  it("throws with status_code 403 when access is denied", async () => {
    mockFetchResponse(403, { message: "Access denied." });

    await expect(confirmInvoicePayment("ABC123", "bad-tok", "pi_test")).rejects.toMatchObject({
      status_code: 403,
      message:     "Access denied.",
    });
  });

  it("throws with status_code 402 when stripe verification fails", async () => {
    mockFetchResponse(402, { message: "Payment verification failed." });

    await expect(confirmInvoicePayment("ABC123", "tok", "pi_bad")).rejects.toMatchObject({
      status_code: 402,
    });
  });

  it("throws with status_code 400 when invoice is not payable", async () => {
    mockFetchResponse(400, { message: "This invoice cannot be paid in its current status." });

    await expect(confirmInvoicePayment("ABC123", "tok", "pi_test")).rejects.toMatchObject({
      status_code: 400,
    });
  });

  it("throws fallback message when JSON parsing fails on error response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok:     false,
      status: 500,
      json:   jest.fn().mockRejectedValue(new Error("parse error")),
    });

    await expect(confirmInvoicePayment("ABC123", "tok", "pi_test")).rejects.toMatchObject({
      message: "Payment confirmation failed.",
    });
  });
});
