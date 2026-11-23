/**
 * Billing page and the SEO subscription payment state
 * (src/components/billing/BillingPage.tsx). The page loads the active
 * subscription next to the saved cards, shows the payment alert, warns before
 * the last card is removed, and reloads the subscription after card changes.
 */

import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import BillingPage from "@/components/billing/BillingPage";
import type { ActiveSeoSubscription, SeoSubscriptionPaymentHealth } from "@/types/client/seo-packages";
import type { PaymentProfile } from "@/types/client/payment-profile";

jest.mock("@/lib/api-client", () => ({
  getToken: jest.fn().mockReturnValue("test-token"),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

jest.mock("@/services/client/payment-profile.service", () => ({
  paymentProfileService: {
    fetchPaymentProfiles: jest.fn(),
    deletePaymentProfile: jest.fn(),
    setDefaultPaymentProfile: jest.fn(),
  },
}));

jest.mock("@/services/client/seo-packages.service", () => ({
  seoPackagesService: {
    fetchActiveSubscription: jest.fn(),
  },
}));

jest.mock("@/lib/stripe", () => ({
  getStripe: jest.fn().mockReturnValue(null),
}));

jest.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/billing/PaymentMethodForm", () => {
  return function MockPaymentMethodForm({ onSuccess }: { onSuccess: (profile: unknown) => void }) {
    return (
      <div>
        <p>Add card form</p>
        <button onClick={() => onSuccess({ id: "card-new" })}>Save mock card</button>
      </div>
    );
  };
});

import { paymentProfileService } from "@/services/client/payment-profile.service";
import { seoPackagesService } from "@/services/client/seo-packages.service";

const profiles = paymentProfileService as jest.Mocked<typeof paymentProfileService>;
const subscriptions = seoPackagesService as jest.Mocked<typeof seoPackagesService>;
const mock_fetch = jest.fn();

function makeHealth(overrides: Partial<SeoSubscriptionPaymentHealth> = {}): SeoSubscriptionPaymentHealth {
  return {
    state: "healthy",
    severity: "ok",
    overdue_periods: 0,
    overdue_amount: 0,
    days_overdue: 0,
    has_usable_card: true,
    card_issue: null,
    failure: null,
    open_invoice: null,
    ...overrides,
  };
}

function makeSubscription(health: Partial<SeoSubscriptionPaymentHealth> = {}): ActiveSeoSubscription {
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
    payment_health: makeHealth(health),
  };
}

const CARD: PaymentProfile = {
  id: "card-1",
  stripe_payment_method_id: "pm_1",
  card_brand: "visa",
  last_four: "4242",
  expiry_month: "12",
  expiry_year: "2030",
  cardholder_name: "Cathleen Siech",
  billing_address: null,
  is_default: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const DECLINED = {
  state: "retrying" as const,
  severity: "warning" as const,
  overdue_periods: 1,
  overdue_amount: 2000,
  failure: {
    period_label: "December 2026",
    amount: 2000,
    reason: "Your bank declined the payment due to insufficient funds.",
    next_retry_at: "2026-12-04T15:00:00Z",
  },
  open_invoice: { unique_id: "ABC123", invoice_number: "BSM-1042" },
};

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = mock_fetch as unknown as typeof fetch;
  mock_fetch.mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue({ client_secret: "seti_secret" }) });
  profiles.fetchPaymentProfiles.mockResolvedValue([CARD]);
  profiles.deletePaymentProfile.mockResolvedValue(undefined);
  subscriptions.fetchActiveSubscription.mockResolvedValue(makeSubscription());
});

describe("BillingPage subscription payments", () => {
  it("shows no payment alert while the subscription is paid up", async () => {
    render(<BillingPage />);

    expect(await screen.findByText("Payment Methods")).toBeInTheDocument();
    await waitFor(() => expect(subscriptions.fetchActiveSubscription).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/did not go through/)).not.toBeInTheDocument();
  });

  it("shows a declined renewal with the reason and a link to pay the invoice", async () => {
    subscriptions.fetchActiveSubscription.mockResolvedValue(makeSubscription(DECLINED));
    render(<BillingPage />);

    const alert = await screen.findByRole("status", { name: "Your SEO subscription payment did not go through" });
    expect(within(alert).getByText(/insufficient funds/)).toBeInTheDocument();
    expect(within(alert).getByRole("link", { name: /Pay invoice #BSM-1042/ })).toHaveAttribute("href", "/invoices/ABC123");
  });

  it("opens the card form in place from the alert", async () => {
    subscriptions.fetchActiveSubscription.mockResolvedValue(
      makeSubscription({ state: "no_payment_method", severity: "warning", has_usable_card: false, card_issue: "missing" })
    );
    profiles.fetchPaymentProfiles.mockResolvedValue([]);
    render(<BillingPage />);

    const alert = await screen.findByRole("status", { name: "Add a card to keep your SEO subscription running" });
    fireEvent.click(within(alert).getByRole("button", { name: /Add a card/ }));

    expect(await screen.findByText("Add card form")).toBeInTheDocument();
    expect(mock_fetch).toHaveBeenCalledWith("/api/stripe/setup-intent", expect.objectContaining({ method: "POST" }));
  });

  it("reloads the subscription after a new card is saved, so the alert clears", async () => {
    subscriptions.fetchActiveSubscription.mockResolvedValueOnce(
      makeSubscription({ state: "no_payment_method", severity: "warning", has_usable_card: false, card_issue: "missing" })
    );
    profiles.fetchPaymentProfiles.mockResolvedValueOnce([]);
    render(<BillingPage />);

    const alert = await screen.findByRole("status", { name: "Add a card to keep your SEO subscription running" });
    fireEvent.click(within(alert).getByRole("button", { name: /Add a card/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Save mock card" }));

    expect(await screen.findByText("Payment Methods")).toBeInTheDocument();
    expect(subscriptions.fetchActiveSubscription).toHaveBeenCalledTimes(2);
    expect(screen.queryByText("Add a card to keep your SEO subscription running")).not.toBeInTheDocument();
  });

  it("warns before removing the last card and reloads the subscription after", async () => {
    render(<BillingPage />);
    await screen.findByText("Payment Methods");
    await waitFor(() => expect(subscriptions.fetchActiveSubscription).toHaveBeenCalledTimes(1));

    subscriptions.fetchActiveSubscription.mockResolvedValue(
      makeSubscription({ state: "no_payment_method", severity: "warning", has_usable_card: false, card_issue: "missing" })
    );

    fireEvent.click(screen.getAllByRole("button", { name: /Remove/ })[0]);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/Your SEO subscription uses this card/)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Yes, Remove It" }));

    await waitFor(() => expect(profiles.deletePaymentProfile).toHaveBeenCalledWith("card-1"));
    expect(
      await screen.findByRole("status", { name: "Add a card to keep your SEO subscription running" })
    ).toBeInTheDocument();
    expect(subscriptions.fetchActiveSubscription).toHaveBeenCalledTimes(2);
  });

  it("keeps working when the subscription can not be loaded", async () => {
    subscriptions.fetchActiveSubscription.mockResolvedValue(null);
    render(<BillingPage />);

    expect(await screen.findByText("Payment Methods")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: /Remove/ })[0]);
    expect(within(screen.getByRole("dialog")).queryByText(/Your SEO subscription uses this card/)).not.toBeInTheDocument();
  });
});
