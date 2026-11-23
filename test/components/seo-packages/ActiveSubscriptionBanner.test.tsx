/**
 * Tests for the client side active subscription banner
 * (src/components/seo-packages/ActiveSubscriptionBanner.tsx). A client on a
 * custom priced plan must see their own price, not the listed package price.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import ActiveSubscriptionBanner from "@/components/seo-packages/ActiveSubscriptionBanner";
import type { ActiveSeoSubscription } from "@/types/client/seo-packages";

function makeSubscription(overrides: Partial<ActiveSeoSubscription> = {}): ActiveSeoSubscription {
  return {
    id: 7,
    package: null,
    status: "active",
    starts_at: "2026-11-01T12:00:00",
    ends_at: null,
    created_at: "2026-11-01T12:00:00",
    plan_name: "Custom Growth Plus",
    pricing_type: "custom",
    monthly_price: 2000,
    auto_renew: true,
    next_billing_date: "2026-12-01",
    ...overrides,
  };
}

describe("ActiveSubscriptionBanner", () => {
  it("shows the custom plan name and negotiated price", () => {
    render(<ActiveSubscriptionBanner subscription={makeSubscription()} />);

    expect(screen.getByText("Custom Growth Plus")).toBeInTheDocument();
    expect(screen.getByText("$2,000/month")).toBeInTheDocument();
  });

  it("uses the subscription price even when the listed package costs less", () => {
    render(
      <ActiveSubscriptionBanner
        subscription={makeSubscription({
          plan_name: "Growth",
          monthly_price: 1750.5,
          package: { id: "growth", name: "Growth", slug: "growth", price_per_month: 1499 },
        })}
      />
    );

    expect(screen.getByText("$1,750.50/month")).toBeInTheDocument();
    expect(screen.queryByText("$1,499/month")).not.toBeInTheDocument();
  });

  it("shows the next renewal for auto renewing plans", () => {
    render(<ActiveSubscriptionBanner subscription={makeSubscription()} />);

    expect(screen.getByText("Next renewal")).toBeInTheDocument();
    expect(screen.getByText("December 1, 2026")).toBeInTheDocument();
  });

  it("shows the end date when the plan expires, and Ongoing for manual billing", () => {
    const { rerender } = render(<ActiveSubscriptionBanner subscription={makeSubscription({ ends_at: "2027-05-31T12:00:00" })} />);
    expect(screen.getByText("Expires")).toBeInTheDocument();
    expect(screen.getByText("May 31, 2027")).toBeInTheDocument();

    rerender(<ActiveSubscriptionBanner subscription={makeSubscription({ auto_renew: false })} />);
    expect(screen.getByText("Renewal")).toBeInTheDocument();
    expect(screen.getByText("Ongoing")).toBeInTheDocument();
  });
});
