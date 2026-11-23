/**
 * Tests for the payment health card on the subscription detail page
 * (src/components/admin/seo-packages-subscriptions/SubscriptionPaymentHealthCard.tsx).
 */

import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import SubscriptionPaymentHealthCard from "@/components/admin/seo-packages-subscriptions/SubscriptionPaymentHealthCard";
import type {
  AdminSeoSubscriptionFailure,
  AdminSeoSubscriptionPaymentHealth,
} from "@/services/admin/seo-packages-subscription.service";
import { makeHealth, makeSubscription } from "./fixtures";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

function makeFailure(overrides: Partial<AdminSeoSubscriptionFailure> = {}): AdminSeoSubscriptionFailure {
  return {
    charge_id: 1,
    period_label: "December 2026",
    period_start: "2026-12-01",
    amount: 2000,
    code: "insufficient_funds",
    message: "Your card has insufficient funds.",
    client_reason: "Your bank declined the payment due to insufficient funds.",
    attempt_count: 2,
    max_attempts: 4,
    last_attempt_at: "2026-12-04T15:00:00Z",
    next_retry_at: "2026-12-09T15:00:00Z",
    is_retryable: true,
    card_label: "Visa ending in 4242",
    ...overrides,
  };
}

const INVOICE = { id: "inv-1", unique_id: "ABC123", invoice_number: "BSM-1042", status: "unpaid" };

function renderCard(health: AdminSeoSubscriptionPaymentHealth, subscription = makeSubscription()) {
  const onCancel = jest.fn();
  const view = render(<SubscriptionPaymentHealthCard subscription={subscription} health={health} onCancel={onCancel} />);
  return { ...view, onCancel };
}

const RETRYING = makeHealth({
  state: "retrying",
  severity: "warning",
  overdue_periods: 1,
  overdue_amount: 2000,
  oldest_due_date: "2026-12-01",
  days_overdue: 3,
  failure: makeFailure(),
  open_invoice: INVOICE,
});

describe("SubscriptionPaymentHealthCard", () => {
  // ── Visibility ────────────────────────────────────────────────────────────

  it.each(["healthy", "inactive"] as const)("renders nothing when the state is %s", (state) => {
    const { container } = renderCard(makeHealth({ state }));

    expect(container).toBeEmptyDOMElement();
  });

  it("uses a polite status for warnings and an alert for critical problems", () => {
    const { unmount } = renderCard(RETRYING);
    expect(screen.getByRole("status", { name: "The December 2026 renewal was declined" })).toHaveAttribute(
      "data-severity",
      "warning"
    );
    unmount();

    renderCard({ ...RETRYING, state: "payment_failed", severity: "critical" });
    expect(screen.getByRole("alert", { name: "Automatic renewal failed, action needed" })).toBeInTheDocument();
    expect(screen.getByText("Needs attention")).toBeInTheDocument();
  });

  // ── Retrying ──────────────────────────────────────────────────────────────

  it("shows the balance, how far behind and the next retry", () => {
    renderCard(RETRYING);

    expect(screen.getByText("Retry scheduled")).toBeInTheDocument();
    expect(screen.getByText("$2,000.00")).toBeInTheDocument();
    expect(screen.getByText("1 period unpaid")).toBeInTheDocument();
    expect(screen.getByText("1 month")).toBeInTheDocument();
    expect(screen.getByText("Since Dec 1, 2026")).toBeInTheDocument();
    expect(screen.getByText("3 days")).toBeInTheDocument();
    const next_retry = screen.getByText("Next retry").closest("div") as HTMLElement;
    expect(within(next_retry).getByText("Dec 9")).toBeInTheDocument();
    expect(within(next_retry).getByText("Attempt 2 of 4")).toBeInTheDocument();
  });

  it("shows the raw decline for admins and what the client was told", () => {
    renderCard(RETRYING);

    expect(screen.getByText("Insufficient funds")).toBeInTheDocument();
    expect(screen.getByText("Your card has insufficient funds.")).toBeInTheDocument();
    expect(screen.getByText("Your bank declined the payment due to insufficient funds.")).toBeInTheDocument();
    expect(screen.queryByText("Retry will not fix it")).not.toBeInTheDocument();
  });

  it("draws every attempt: the declines, the scheduled retry and the ones left", () => {
    renderCard(RETRYING);

    const steps = within(screen.getByRole("list", { name: "Automatic payment attempts" })).getAllByRole("listitem");
    expect(steps.map((step) => step.getAttribute("data-status"))).toEqual(["failed", "failed", "scheduled", "upcoming"]);
    expect(steps[0]).toHaveTextContent("First charge");
    expect(steps[1]).toHaveTextContent("Declined, Dec 4");
    expect(steps[2]).toHaveTextContent("Dec 9");
    expect(steps[3]).toHaveTextContent("If needed");
  });

  // ── Payment failed ────────────────────────────────────────────────────────

  it("marks the attempts left as stopped once retries are over", () => {
    renderCard({
      ...RETRYING,
      state: "payment_failed",
      severity: "critical",
      failure: makeFailure({ attempt_count: 1, next_retry_at: null, code: "expired_card", is_retryable: false }),
    });

    const steps = within(screen.getByRole("list", { name: "Automatic payment attempts" })).getAllByRole("listitem");
    expect(steps.map((step) => step.getAttribute("data-status"))).toEqual(["failed", "skipped", "skipped", "skipped"]);
    expect(screen.getByText("Retry will not fix it")).toBeInTheDocument();
    const next_retry = screen.getByText("Next retry").closest("div") as HTMLElement;
    expect(within(next_retry).getByText("Stopped")).toBeInTheDocument();
    expect(steps[1]).toHaveTextContent("Stopped");
  });

  it("suggests cancelling when the client is two or more months behind", () => {
    const { onCancel } = renderCard({
      ...RETRYING,
      state: "payment_failed",
      severity: "critical",
      overdue_periods: 2,
      overdue_amount: 4000,
      suggest_cancellation: true,
      failure: makeFailure({ next_retry_at: null }),
    });

    expect(screen.getByText(/You can keep trying to collect, or cancel the subscription now/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Cancel subscription/ }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("still offers cancelling when it is not suggested, without the nudge", () => {
    const { onCancel } = renderCard(RETRYING);

    expect(screen.queryByText(/You can keep trying to collect/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Cancel subscription/ }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  // ── Actions ───────────────────────────────────────────────────────────────

  it("links to the open invoice and the checkout page", () => {
    renderCard(RETRYING);

    expect(screen.getByRole("link", { name: /Invoice #BSM-1042/ })).toHaveAttribute("href", "/admin/invoices/inv-1");
    expect(screen.getByRole("link", { name: /Retry payment now/ })).toHaveAttribute(
      "href",
      "/admin/seo-packages-subscriptions/7/charge"
    );
    expect(screen.getByText("The client was emailed about this payment with a link to fix it.")).toBeInTheDocument();
  });

  it("hides the invoice link when there is no open invoice", () => {
    renderCard({ ...RETRYING, open_invoice: null });

    expect(screen.queryByRole("link", { name: /Invoice #/ })).not.toBeInTheDocument();
  });

  // ── Payment pending ───────────────────────────────────────────────────────

  it("explains a pending payment for manual billing without a failure", () => {
    renderCard(
      makeHealth({
        state: "payment_pending",
        severity: "critical",
        overdue_periods: 2,
        overdue_amount: 4000,
        oldest_due_date: "2026-10-01",
        days_overdue: 61,
        suggest_cancellation: true,
      }),
      makeSubscription({ auto_renew: false })
    );

    expect(screen.getByRole("alert", { name: "Payment pending for 2 months" })).toBeInTheDocument();
    expect(screen.getByText("$4,000.00")).toBeInTheDocument();
    expect(screen.getByText("61 days")).toBeInTheDocument();
    expect(screen.getByText("Manual")).toBeInTheDocument();
    expect(screen.getByText("No attempt yet")).toBeInTheDocument();
    expect(screen.queryByText("Why it failed")).not.toBeInTheDocument();
    expect(screen.getByText(/Manual billing: the client is only charged when an admin uses Charge now/)).toBeInTheDocument();
  });

  // ── No card ───────────────────────────────────────────────────────────────

  it("warns about a missing card before the renewal, without any metrics", () => {
    renderCard(
      makeHealth({ state: "no_payment_method", severity: "warning", has_usable_card: false, card_issue: "missing" }),
      makeSubscription({ next_billing_date: "2026-12-20", payment_profile: null })
    );

    expect(screen.getByRole("status", { name: "The client has no card on file" })).toBeInTheDocument();
    expect(screen.getByText(/renewal on December 20 will fail/)).toBeInTheDocument();
    expect(screen.queryByText("Outstanding")).not.toBeInTheDocument();
    expect(screen.getByText("Renewals cannot be charged until the client adds a valid card.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Charge now/ })).toBeInTheDocument();
  });

  it("names the renewal card when there is no card problem", () => {
    renderCard(
      RETRYING,
      makeSubscription({
        payment_profile: { id: "card-1", card_brand: "visa", last_four: "4242", expiry_month: "12", expiry_year: "2030" },
      })
    );

    expect(screen.getByText("Visa ending in 4242")).toBeInTheDocument();
    expect(screen.getByText("Used for the next automatic or manual charge.")).toBeInTheDocument();
  });

  it("never renders an em dash", () => {
    const { container } = renderCard({ ...RETRYING, suggest_cancellation: true, overdue_periods: 2 });

    expect(container.textContent).not.toContain("—");
  });
});
