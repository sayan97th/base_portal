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

  it("calls the internal Next.js API route /api/stripe/create-payment-intent", async () => {
    mockFetchResponse(200, { client_secret: "pi_secret_abc", payment_intent_id: "pi_abc" });

    await createInvoicePaymentIntent(50000, "UNIQUE123", "tok-abc");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/stripe/create-payment-intent",
      expect.any(Object)
    );
  });

  it("sends correct JSON body with amount_cents, metadata, and idempotency_key", async () => {
    mockFetchResponse(200, { client_secret: "pi_secret_abc", payment_intent_id: "pi_abc" });

    await createInvoicePaymentIntent(75000, "INV-XYZ", "token-123");

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string);

    expect(body.amount_cents).toBe(75000);
    expect(body.metadata.invoice_unique_id).toBe("INV-XYZ");
    expect(body.metadata.token).toBe("token-123");
    expect(body.idempotency_key).toContain("INV-XYZ");
  });

  it("uses POST method", async () => {
    mockFetchResponse(200, { client_secret: "pi_secret", payment_intent_id: "pi_id" });

    await createInvoicePaymentIntent(10000, "INV-1", "tok");

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(options.method).toBe("POST");
  });

  it("returns client_secret and payment_intent_id on success", async () => {
    const expected = { client_secret: "pi_secret_xyz", payment_intent_id: "pi_xyz" };
    mockFetchResponse(200, expected);

    const result = await createInvoicePaymentIntent(10000, "INV-1", "tok");

    expect(result.client_secret).toBe("pi_secret_xyz");
    expect(result.payment_intent_id).toBe("pi_xyz");
  });

  it("throws Error with message when response is not ok", async () => {
    mockFetchResponse(400, { error: "Invalid amount." });

    await expect(createInvoicePaymentIntent(0, "INV-1", "tok")).rejects.toThrow("Invalid amount.");
  });

  it("throws with fallback message when error has no message field", async () => {
    mockFetchResponse(500, {});

    await expect(createInvoicePaymentIntent(1000, "INV-1", "tok")).rejects.toThrow(
      "Failed to initialize payment."
    );
  });

  it("builds a deterministic idempotency_key from invoice_unique_id, amount, and token", async () => {
    mockFetchResponse(200, { client_secret: "pi_s", payment_intent_id: "pi_id" });

    await createInvoicePaymentIntent(25000, "INVID", "MYTOKEN");

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string);

    expect(body.idempotency_key).toBe("invoice-INVID-25000-MYTOKEN");
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
