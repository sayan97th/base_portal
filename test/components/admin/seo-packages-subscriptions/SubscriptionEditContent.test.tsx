/**
 * Tests for the edit page loader
 * (src/components/admin/seo-packages-subscriptions/SubscriptionEditContent.tsx).
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import SubscriptionEditContent from "@/components/admin/seo-packages-subscriptions/SubscriptionEditContent";
import { makeDetail } from "./fixtures";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// The form has its own tests; here it only has to receive the subscription.
jest.mock("@/components/admin/seo-packages-subscriptions/SubscriptionForm", () => ({
  __esModule: true,
  default: ({ mode, subscription }: { mode: string; subscription: { plan_name: string } }) => (
    <div data-testid="subscription-form">
      {mode}: {subscription.plan_name}
    </div>
  ),
}));

jest.mock("@/services/admin/seo-packages-subscription.service", () => ({
  ...jest.requireActual("@/services/admin/seo-packages-subscription.service"),
  adminSeoSubscriptionService: {
    fetchSubscriptionDetail: jest.fn(),
  },
}));

import { adminSeoSubscriptionService } from "@/services/admin/seo-packages-subscription.service";

const service = adminSeoSubscriptionService as jest.Mocked<typeof adminSeoSubscriptionService>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("SubscriptionEditContent", () => {
  it("renders the form in edit mode for an active subscription", async () => {
    service.fetchSubscriptionDetail.mockResolvedValue(makeDetail());

    render(<SubscriptionEditContent subscription_id={7} />);

    expect(await screen.findByTestId("subscription-form")).toHaveTextContent("edit: Custom SEO Package");
    expect(service.fetchSubscriptionDetail).toHaveBeenCalledWith(7);
  });

  it.each(["cancelled", "expired"] as const)("blocks editing a %s subscription", async (status) => {
    service.fetchSubscriptionDetail.mockResolvedValue(makeDetail({ status }));

    render(<SubscriptionEditContent subscription_id={7} />);

    expect(await screen.findByText(`This subscription is ${status} and can no longer be edited.`)).toBeInTheDocument();
    expect(screen.queryByTestId("subscription-form")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to subscription" })).toHaveAttribute("href", "/admin/seo-packages-subscriptions/7");
  });

  it("shows the load error", async () => {
    service.fetchSubscriptionDetail.mockRejectedValue({ message: "Subscription not found." });

    render(<SubscriptionEditContent subscription_id={999} />);

    expect(await screen.findByText("Subscription not found.")).toBeInTheDocument();
  });
});
