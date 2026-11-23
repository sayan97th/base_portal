/**
 * Tests for the admin SEO subscription service
 * (src/services/admin/seo-packages-subscription.service.ts).
 */

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
}));

import { apiClient } from "@/lib/api-client";
import {
  adminSeoSubscriptionService,
  extractApiError,
} from "@/services/admin/seo-packages-subscription.service";

const mocked = apiClient as jest.Mocked<typeof apiClient>;
const BASE_URL = "/api/admin/seo-packages/subscriptions";

describe("admin SEO subscription service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocked.get.mockResolvedValue({ data: [] });
    mocked.post.mockResolvedValue({ data: { id: 1 }, summary: {} });
    mocked.patch.mockResolvedValue({ data: { id: 1 }, summary: {} });
  });

  it("lists subscriptions without a query string when there are no filters", async () => {
    await adminSeoSubscriptionService.fetchSubscriptions();

    expect(mocked.get).toHaveBeenCalledWith(BASE_URL);
  });

  it("only sends the filters that have a value", async () => {
    await adminSeoSubscriptionService.fetchSubscriptions({
      page: 2,
      per_page: 20,
      search: "Printed Image",
      status: undefined,
      payment_status: "past_due",
      sort_field: "next_billing_date",
      sort_direction: "asc",
    });

    expect(mocked.get).toHaveBeenCalledWith(
      `${BASE_URL}?page=2&per_page=20&search=Printed+Image&sort_field=next_billing_date&sort_direction=asc&payment_status=past_due`
    );
  });

  it("returns the detail response with its summary untouched", async () => {
    const detail = { data: { id: 7 }, summary: { total_collected: 2000 } };
    mocked.get.mockResolvedValueOnce(detail);

    await expect(adminSeoSubscriptionService.fetchSubscriptionDetail(7)).resolves.toBe(detail);
    expect(mocked.get).toHaveBeenCalledWith(`${BASE_URL}/7`);
  });

  it("unwraps the stats", async () => {
    mocked.get.mockResolvedValueOnce({ data: { total: 3 } });

    await expect(adminSeoSubscriptionService.fetchStats()).resolves.toEqual({ total: 3 });
    expect(mocked.get).toHaveBeenCalledWith(`${BASE_URL}/stats`);
  });

  it("activates with the full payload and returns the charge result", async () => {
    const result = { data: { id: 9 }, charge_result: { success: true, message: "Charged" } };
    mocked.post.mockResolvedValueOnce(result);
    const payload = {
      user_id: 4,
      pricing_type: "custom" as const,
      custom_price: 2000,
      starts_at: "2026-11-25",
      first_billing_date: "2026-11-25",
      auto_renew: true,
      reminder_days_before: null,
      charge_now: true,
    };

    await expect(adminSeoSubscriptionService.activateSubscription(payload)).resolves.toBe(result);
    expect(mocked.post).toHaveBeenCalledWith(BASE_URL, payload);
  });

  it("patches settings, charges and cancels on their own endpoints", async () => {
    await adminSeoSubscriptionService.updateSubscription(9, { auto_renew: false });
    await adminSeoSubscriptionService.chargeNow(9);
    await adminSeoSubscriptionService.chargeNow(9, "card-2");
    await adminSeoSubscriptionService.cancelSubscription(9, { notes: "Client left" });

    expect(mocked.patch).toHaveBeenNthCalledWith(1, `${BASE_URL}/9`, { auto_renew: false });
    expect(mocked.post).toHaveBeenNthCalledWith(1, `${BASE_URL}/9/charge`, { payment_profile_id: null });
    expect(mocked.post).toHaveBeenNthCalledWith(2, `${BASE_URL}/9/charge`, { payment_profile_id: "card-2" });
    expect(mocked.patch).toHaveBeenNthCalledWith(2, `${BASE_URL}/9/cancel`, { notes: "Client left" });
  });

  it("loads the cards on file of a client", async () => {
    mocked.get.mockResolvedValueOnce({ data: [{ id: "card-1" }] });

    await expect(adminSeoSubscriptionService.listClientPaymentProfiles(4)).resolves.toEqual([{ id: "card-1" }]);
    expect(mocked.get).toHaveBeenCalledWith(`${BASE_URL}/payment-profiles?user_id=4`);
  });

  it("loads every client for the client picker", async () => {
    await adminSeoSubscriptionService.listAllClients();

    expect(mocked.get).toHaveBeenCalledWith("/api/admin/users?type=client&per_page=500");
  });
});

describe("extractApiError", () => {
  it("prefers the first field validation error", () => {
    expect(
      extractApiError(
        { message: "The given data was invalid.", errors: { custom_price: ["The monthly amount must be at least $0.50."] } },
        "Fallback"
      )
    ).toBe("The monthly amount must be at least $0.50.");
  });

  it("uses the message, then the fallback", () => {
    expect(extractApiError({ message: "The card was declined." }, "Fallback")).toBe("The card was declined.");
    expect(extractApiError(undefined, "Fallback")).toBe("Fallback");
    expect(extractApiError(new Error(""), "Fallback")).toBe("Fallback");
  });
});
