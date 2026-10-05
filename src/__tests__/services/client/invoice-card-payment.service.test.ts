jest.mock("@/lib/api-client", () => ({
  apiClient: { post: jest.fn() },
}));

import { apiClient } from "@/lib/api-client";
import { invoiceCardPaymentService } from "@/services/client/invoice-card-payment.service";

const mocked_api_client = apiClient as jest.Mocked<typeof apiClient>;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

function mockFetchResponse(body: unknown, ok = true, status = 200) {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    status,
    json: jest.fn().mockResolvedValue(body),
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("authenticated flow (apiClient)", () => {
  it("creates a PaymentIntent with a saved card", async () => {
    mocked_api_client.post.mockResolvedValueOnce({
      data: { client_secret: "secret", payment_intent_id: "pi_1" },
    } as never);

    const result = await invoiceCardPaymentService.createAuthenticatedPaymentIntent("B72E1872", {
      payment_profile_id: "profile-1",
    });

    expect(mocked_api_client.post).toHaveBeenCalledWith("/api/invoices/B72E1872/payment-intent", {
      payment_profile_id: "profile-1",
    });
    expect(result).toEqual({ client_secret: "secret", payment_intent_id: "pi_1" });
  });

  it("encodes the invoice id in the URL", async () => {
    mocked_api_client.post.mockResolvedValueOnce({ data: {} } as never);

    await invoiceCardPaymentService.createAuthenticatedPaymentIntent("A/B C", { save_card: true });

    expect(mocked_api_client.post).toHaveBeenCalledWith("/api/invoices/A%2FB%20C/payment-intent", {
      save_card: true,
    });
  });

  it("records the payment as a credit card payment", async () => {
    mocked_api_client.post.mockResolvedValueOnce({} as never);

    await invoiceCardPaymentService.confirmAuthenticatedPayment("B72E1872", "pi_1");

    expect(mocked_api_client.post).toHaveBeenCalledWith("/api/invoices/B72E1872/pay", {
      payment_method: "credit_card",
      payment_intent_id: "pi_1",
    });
  });

  it("propagates API errors", async () => {
    mocked_api_client.post.mockRejectedValueOnce({ message: "Saved card not found.", status_code: 404 });

    await expect(
      invoiceCardPaymentService.createAuthenticatedPaymentIntent("B72E1872", { payment_profile_id: "x" })
    ).rejects.toEqual({ message: "Saved card not found.", status_code: 404 });
  });
});

describe("public share-link flow (fetch)", () => {
  it("creates a PaymentIntent with the token and no Authorization header", async () => {
    mockFetchResponse({ data: { client_secret: "secret", payment_intent_id: "pi_pub" } });

    const result = await invoiceCardPaymentService.createPublicPaymentIntent("B72E1872", "share-token");

    expect(result).toEqual({ client_secret: "secret", payment_intent_id: "pi_pub" });
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const [request_url, request_init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(request_url).toBe(`${API_BASE_URL}/api/invoices/B72E1872/payment-intent`);
    expect(request_init.method).toBe("POST");
    expect(request_init.headers).not.toHaveProperty("Authorization");
    expect(JSON.parse(request_init.body)).toEqual({ token: "share-token" });
    expect(mocked_api_client.post).not.toHaveBeenCalled();
  });

  it("records the payment with the token", async () => {
    mockFetchResponse({ message: "Payment confirmed successfully." });

    await invoiceCardPaymentService.confirmPublicPayment("B72E1872", "share-token", "pi_pub");

    const [request_url, request_init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(request_url).toBe(`${API_BASE_URL}/api/invoices/B72E1872/pay`);
    expect(JSON.parse(request_init.body)).toEqual({ payment_intent_id: "pi_pub", token: "share-token" });
  });

  it("throws the API message and status code on failure", async () => {
    mockFetchResponse({ message: "Access denied." }, false, 403);

    await expect(invoiceCardPaymentService.createPublicPaymentIntent("B72E1872", "bad")).rejects.toEqual({
      message: "Access denied.",
      status_code: 403,
    });
  });

  it("uses a fallback message when the error body is not JSON", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: jest.fn().mockRejectedValue(new Error("not json")),
    }) as unknown as typeof fetch;

    await expect(invoiceCardPaymentService.confirmPublicPayment("B72E1872", "tok", "pi")).rejects.toEqual({
      message: "An unexpected error occurred.",
      status_code: 500,
    });
  });
});
