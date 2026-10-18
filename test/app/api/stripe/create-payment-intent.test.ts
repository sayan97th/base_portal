/**
 * @jest-environment node
 *
 * Regression coverage for the same divergent-Stripe-Customer bug in the
 * checkout "save this card for later" flow (CheckoutStep.tsx passes
 * save_for_future: true). This route used to look up or create the Stripe
 * Customer itself by searching Stripe for the user's email, independent of
 * `users.stripe_customer_id`. A card saved this way could attach to a
 * different Customer than the one PaymentProfileController later resolves,
 * so the save would silently fail. The fix routes customer resolution through
 * Laravel's /api/stripe/customer endpoint instead.
 */
import { NextRequest } from "next/server";

const ORIGINAL_ENV = process.env;

const mockPaymentIntentsCreate = jest.fn();
const mockPaymentMethodsRetrieve = jest.fn();

jest.mock("stripe", () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents:  { create: mockPaymentIntentsCreate },
    paymentMethods:  { retrieve: mockPaymentMethodsRetrieve },
  }));
});

function buildRequest(body: Record<string, unknown>, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost/api/stripe/create-payment-intent", {
    method:  "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body:    JSON.stringify(body),
  });
}

describe("POST /api/stripe/create-payment-intent", () => {
  const mockFetch = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    global.fetch = mockFetch as unknown as typeof fetch;
    process.env = {
      ...ORIGINAL_ENV,
      NEXT_PUBLIC_API_BASE_URL: "http://api.test",
      STRIPE_SECRET_KEY:        "sk_test_dummy",
    };
    mockPaymentIntentsCreate.mockResolvedValue({
      client_secret: "pi_secret_abc",
      id:             "pi_abc",
    });
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it("resolves the Stripe Customer through the Laravel /api/stripe/customer endpoint when saving a new card", async () => {
    mockFetch.mockResolvedValueOnce({
      ok:   true,
      json: jest.fn().mockResolvedValue({ stripe_customer_id: "cus_from_backend" }),
    });

    const { POST } = await import("@/app/api/stripe/create-payment-intent/route");

    const response = await POST(
      buildRequest(
        { amount_cents: 5000, save_for_future: true },
        { Authorization: "Bearer user-token" }
      )
    );

    expect(response.status).toBe(200);

    // Customer must be resolved via the backend, never via a direct Stripe
    // customer search/create call performed inside this route.
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.test/api/stripe/customer",
      expect.objectContaining({
        method:  "POST",
        headers: expect.objectContaining({ Authorization: "Bearer user-token" }),
      })
    );

    // The resolved customer must be the one actually used to create the PI,
    // together with setup_future_usage so the resulting PM can be saved later.
    expect(mockPaymentIntentsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer:           "cus_from_backend",
        setup_future_usage: "off_session",
      }),
      undefined
    );
  });

  it("does not resolve a customer when save_for_future is not requested", async () => {
    const { POST } = await import("@/app/api/stripe/create-payment-intent/route");

    const response = await POST(
      buildRequest({ amount_cents: 5000 }, { Authorization: "Bearer user-token" })
    );

    expect(response.status).toBe(200);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockPaymentIntentsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ automatic_payment_methods: { enabled: true } }),
      undefined
    );
  });

  it("proceeds without a customer when the backend customer resolution fails, instead of creating one directly", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, json: jest.fn().mockResolvedValue({}) });

    const { POST } = await import("@/app/api/stripe/create-payment-intent/route");

    const response = await POST(
      buildRequest(
        { amount_cents: 5000, save_for_future: true },
        { Authorization: "Bearer user-token" }
      )
    );

    expect(response.status).toBe(200);
    expect(mockPaymentIntentsCreate).toHaveBeenCalledWith(
      expect.not.objectContaining({ customer: expect.anything() }),
      undefined
    );
  });

  it("resolves the customer by retrieving the PaymentMethod when charging a saved card, without calling the backend", async () => {
    mockPaymentMethodsRetrieve.mockResolvedValueOnce({ customer: "cus_already_attached" });

    const { POST } = await import("@/app/api/stripe/create-payment-intent/route");

    const response = await POST(
      buildRequest({ amount_cents: 5000, stripe_payment_method_id: "pm_saved" })
    );

    expect(response.status).toBe(200);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockPaymentIntentsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_already_attached" }),
      undefined
    );
  });

  it("returns 400 for an invalid amount", async () => {
    const { POST } = await import("@/app/api/stripe/create-payment-intent/route");

    const response = await POST(buildRequest({ amount_cents: 0 }));

    expect(response.status).toBe(400);
    expect(mockPaymentIntentsCreate).not.toHaveBeenCalled();
  });
});
