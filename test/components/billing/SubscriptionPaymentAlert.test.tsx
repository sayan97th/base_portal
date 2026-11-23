import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import SubscriptionPaymentAlert from "@/components/billing/SubscriptionPaymentAlert";
import BillingInformation from "@/components/billing/BillingInformation";
import type { ActiveSeoSubscription, SeoSubscriptionPaymentHealth } from "@/types/client/seo-packages";
import type { PaymentProfile } from "@/types/client/payment-profile";

/**
 * What a client sees about their SEO subscription payments: a declined
 * renewal, a pending payment or a missing card, and the warning before they
 * remove the last card an automatic renewal depends on.
 */

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

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

function makeSubscription(overrides: Partial<ActiveSeoSubscription> = {}): ActiveSeoSubscription {
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
    payment_health: makeHealth(),
    ...overrides,
  };
}

function makeCard(overrides: Partial<PaymentProfile> = {}): PaymentProfile {
  return {
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
    ...overrides,
  };
}

describe("SubscriptionPaymentAlert", () => {
  it("renders nothing while payments are up to date", () => {
    const { container } = render(<SubscriptionPaymentAlert subscription={makeSubscription()} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("explains a declined renewal in plain language with both ways to fix it", () => {
    render(
      <SubscriptionPaymentAlert
        subscription={makeSubscription({
          payment_status: "past_due",
          payment_health: makeHealth({
            state: "retrying",
            severity: "warning",
            overdue_periods: 1,
            overdue_amount: 2000,
            failure: {
              period_label: "December 2026",
              amount: 2000,
              reason: "Your bank declined the payment due to insufficient funds.",
              next_retry_at: "2026-12-04T15:00:00Z",
            },
            open_invoice: { unique_id: "ABC123", invoice_number: "BSM-1042" },
          }),
        })}
      />
    );

    const alert = screen.getByRole("status", { name: "Your SEO subscription payment did not go through" });
    expect(within(alert).getByText(/insufficient funds/)).toBeInTheDocument();
    expect(within(alert).getByText(/December 4/)).toBeInTheDocument();
    expect(within(alert).getByText("$2,000")).toBeInTheDocument();
    expect(within(alert).getByRole("link", { name: /Pay invoice #BSM-1042/ })).toHaveAttribute("href", "/invoices/ABC123");
    expect(within(alert).getByRole("link", { name: /Update payment method/ })).toHaveAttribute("href", "/billing");
  });

  it("asks for a card when there is none, opening the form in place on the billing page", () => {
    const onAddCard = jest.fn();
    render(
      <SubscriptionPaymentAlert
        onAddCard={onAddCard}
        subscription={makeSubscription({
          payment_health: makeHealth({
            state: "no_payment_method",
            severity: "warning",
            has_usable_card: false,
            card_issue: "missing",
          }),
        })}
      />
    );

    expect(screen.getByRole("status", { name: "Add a card to keep your SEO subscription running" })).toBeInTheDocument();
    expect(screen.getByText(/renews automatically on December 20/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Add a card/ }));
    expect(onAddCard).toHaveBeenCalledTimes(1);
  });

  it("never uses an em dash", () => {
    const { container } = render(
      <SubscriptionPaymentAlert
        subscription={makeSubscription({
          payment_health: makeHealth({ state: "payment_pending", severity: "critical", overdue_periods: 2, overdue_amount: 4000 }),
        })}
      />
    );

    expect(container.textContent).not.toContain("—");
    expect(screen.getByRole("alert")).toHaveTextContent("2 months");
  });
});

describe("BillingInformation remove card warning", () => {
  function renderBilling(payment_methods: PaymentProfile[], subscription: ActiveSeoSubscription | null) {
    render(
      <BillingInformation
        payment_methods={payment_methods}
        active_subscription={subscription}
        onAddMethod={jest.fn()}
        onRemoveMethod={jest.fn()}
        onSetDefault={jest.fn()}
      />
    );
  }

  function openRemoveDialog() {
    fireEvent.click(screen.getAllByRole("button", { name: /Remove/ })[0]);
    return screen.getByRole("dialog");
  }

  it("warns before removing the last valid card of an auto renewing subscription", () => {
    renderBilling([makeCard()], makeSubscription());

    const dialog = openRemoveDialog();
    expect(within(dialog).getByText(/Your SEO subscription uses this card/)).toBeInTheDocument();
    expect(within(dialog).getByText(/renews automatically on December 20/)).toBeInTheDocument();
  });

  it("does not warn when another valid card remains", () => {
    renderBilling([makeCard(), makeCard({ id: "card-2", last_four: "1881", is_default: false })], makeSubscription());

    const dialog = openRemoveDialog();
    expect(within(dialog).queryByText(/Your SEO subscription uses this card/)).not.toBeInTheDocument();
  });

  it("does not warn without an auto renewing subscription", () => {
    renderBilling([makeCard()], makeSubscription({ auto_renew: false }));

    const dialog = openRemoveDialog();
    expect(within(dialog).queryByText(/Your SEO subscription uses this card/)).not.toBeInTheDocument();
  });
});
