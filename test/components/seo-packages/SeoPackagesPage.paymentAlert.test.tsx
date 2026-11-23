/**
 * SEO packages page and subscription payment problems
 * (src/components/seo-packages/SeoPackagesPage.tsx). A client with a failed
 * or pending payment sees it above their active subscription, with a link to
 * fix it from the billing page.
 */

import React from "react";
import { render, screen, within } from "@testing-library/react";
import SeoPackagesPage from "@/components/seo-packages/SeoPackagesPage";
import type { ActiveSeoSubscription, SeoSubscriptionPaymentHealth } from "@/types/client/seo-packages";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

jest.mock("@/components/shared/CalendlyWidget", () => ({
  __esModule: true,
  default: () => <div>Calendly</div>,
}));

jest.mock("@/services/client/seo-packages.service", () => ({
  seoPackagesService: {
    fetchSeoPackages: jest.fn().mockResolvedValue([]),
    fetchComparisonRows: jest.fn().mockResolvedValue([]),
    fetchActiveSubscription: jest.fn(),
  },
}));

import { seoPackagesService } from "@/services/client/seo-packages.service";

const service = seoPackagesService as jest.Mocked<typeof seoPackagesService>;

function makeSubscription(health: Partial<SeoSubscriptionPaymentHealth>): ActiveSeoSubscription {
  return {
    id: 7,
    package: null,
    status: "active",
    starts_at: "2026-11-01T00:00:00Z",
    ends_at: null,
    created_at: "2026-11-01T00:00:00Z",
    plan_name: "Custom SEO Package",
    pricing_type: "custom",
    monthly_price: 2000,
    auto_renew: true,
    next_billing_date: "2026-12-20",
    payment_health: {
      state: "healthy",
      severity: "ok",
      overdue_periods: 0,
      overdue_amount: 0,
      days_overdue: 0,
      has_usable_card: true,
      card_issue: null,
      failure: null,
      open_invoice: null,
      ...health,
    },
  };
}

beforeEach(() => jest.clearAllMocks());

describe("SeoPackagesPage payment alert", () => {
  it("shows a failed payment above the active subscription with a link to billing", async () => {
    service.fetchActiveSubscription.mockResolvedValue(
      makeSubscription({
        state: "payment_failed",
        severity: "critical",
        overdue_periods: 1,
        overdue_amount: 2000,
        has_usable_card: false,
        card_issue: "missing",
        failure: {
          period_label: "December 2026",
          amount: 2000,
          reason: "There is no card on file for your account.",
          next_retry_at: null,
        },
      })
    );
    render(<SeoPackagesPage />);

    const alert = await screen.findByRole("alert", { name: "Your SEO subscription payment failed" });
    expect(within(alert).getByText(/There is no card on file for your account/)).toBeInTheDocument();
    expect(within(alert).getByRole("link", { name: /Add a card/ })).toHaveAttribute("href", "/billing");

    // The alert comes before the subscription banner.
    const banner = screen.getByText("Active Subscription");
    expect(alert.compareDocumentPosition(banner) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("shows only the subscription banner when payments are up to date", async () => {
    service.fetchActiveSubscription.mockResolvedValue(makeSubscription({}));
    render(<SeoPackagesPage />);

    expect(await screen.findByText("Active Subscription")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText(/payment failed/i)).not.toBeInTheDocument();
  });
});
