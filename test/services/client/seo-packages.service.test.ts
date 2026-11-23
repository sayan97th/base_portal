/**
 * Tests for the client SEO packages service
 * (src/services/client/seo-packages.service.ts), focused on the active
 * subscription the billing and SEO packages pages use for payment alerts.
 */

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

import { apiClient } from "@/lib/api-client";
import { seoPackagesService } from "@/services/client/seo-packages.service";

const mocked = apiClient as jest.Mocked<typeof apiClient>;

describe("seoPackagesService.fetchActiveSubscription", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unwraps the subscription with its payment health", async () => {
    const subscription = {
      id: 7,
      status: "active",
      payment_status: "past_due",
      payment_health: { state: "retrying", failure: { reason: "Your bank declined the payment." } },
    };
    mocked.get.mockResolvedValue({ data: subscription });

    await expect(seoPackagesService.fetchActiveSubscription()).resolves.toEqual(subscription);
    expect(mocked.get).toHaveBeenCalledWith("/api/seo-packages/subscriptions/active");
  });

  it("returns null when the client has no active subscription", async () => {
    mocked.get.mockResolvedValue({ data: null });

    await expect(seoPackagesService.fetchActiveSubscription()).resolves.toBeNull();
  });

  it("returns null instead of failing, so a billing page never breaks", async () => {
    mocked.get.mockRejectedValue(new Error("Network"));

    await expect(seoPackagesService.fetchActiveSubscription()).resolves.toBeNull();
  });
});
