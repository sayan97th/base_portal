/**
 * @jest-environment node
 *
 * Regression coverage for the "card verified by Stripe but never saved" bug.
 *
 * This route used to call the Stripe SDK directly, searching for (or creating)
 * a Stripe Customer by email, completely independent of the Laravel backend's
 * `users.stripe_customer_id`. When a client added their very first payment
 * method, that produced a second, divergent Customer: the SetupIntent got
 * attached to it, but PaymentProfileController::store() later resolved a
 * *different* customer via the backend and rejected the save with a 409, even
 * though Stripe had already confirmed the card. These tests pin the fix: the
 * route must be a thin proxy to Laravel's own /api/stripe/setup-intent, which
 * is the single source of truth for customer resolution.
 */
import { NextRequest } from "next/server";

const ORIGINAL_ENV = process.env;

function buildRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost/api/stripe/setup-intent", {
    method: "POST",
    headers,
  });
}

describe("POST /api/stripe/setup-intent", () => {
  const mockFetch = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    global.fetch = mockFetch as unknown as typeof fetch;
    process.env = { ...ORIGINAL_ENV, NEXT_PUBLIC_API_BASE_URL: "http://api.test" };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it("returns 401 and never calls the backend when no Authorization header is present", async () => {
    const { POST } = await import("@/app/api/stripe/setup-intent/route");

    const response = await POST(buildRequest());

    expect(response.status).toBe(401);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("proxies the request to the Laravel setup-intent endpoint with the Authorization header forwarded", async () => {
    mockFetch.mockResolvedValueOnce({
      ok:     true,
      status: 200,
      json:   jest.fn().mockResolvedValue({ client_secret: "seti_from_backend_secret" }),
    });

    const { POST } = await import("@/app/api/stripe/setup-intent/route");

    const response = await POST(buildRequest({ Authorization: "Bearer user-token" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ client_secret: "seti_from_backend_secret" });

    // Exactly one outbound call, and it must be the Laravel endpoint — this is
    // the core of the fix: no separate Stripe Customer lookup/creation here.
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.test/api/stripe/setup-intent",
      expect.objectContaining({
        method:  "POST",
        headers: expect.objectContaining({ Authorization: "Bearer user-token" }),
      })
    );
  });

  it("propagates the backend's error message and status when the backend call fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok:     false,
      status: 500,
      json:   jest.fn().mockResolvedValue({ error: "Failed to create setup intent." }),
    });

    const { POST } = await import("@/app/api/stripe/setup-intent/route");

    const response = await POST(buildRequest({ Authorization: "Bearer user-token" }));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Failed to create setup intent.");
  });

  it("returns a generic 500 when the fetch to the backend throws", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network down"));

    const { POST } = await import("@/app/api/stripe/setup-intent/route");

    const response = await POST(buildRequest({ Authorization: "Bearer user-token" }));

    expect(response.status).toBe(500);
  });
});
