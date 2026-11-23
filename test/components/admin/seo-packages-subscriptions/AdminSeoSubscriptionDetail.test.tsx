/**
 * Tests for the SEO subscription page
 * (src/components/admin/seo-packages-subscriptions/AdminSeoSubscriptionDetail.tsx):
 * payment history, billing settings that save instantly, the link to the
 * manual charge page, cancellation and the messages shown after creating or
 * editing (including a first month recorded as paid outside the portal).
 */

import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import AdminSeoSubscriptionDetail from "@/components/admin/seo-packages-subscriptions/AdminSeoSubscriptionDetail";
import { freezeToday, makeCard, makeCharge, makeDetail, makeHealth } from "./fixtures";

const BROWSER_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

jest.mock("@/services/admin/seo-packages-subscription.service", () => ({
  ...jest.requireActual("@/services/admin/seo-packages-subscription.service"),
  adminSeoSubscriptionService: {
    fetchSubscriptionDetail: jest.fn(),
    listClientPaymentProfiles: jest.fn(),
    updateSubscription: jest.fn(),
    chargeNow: jest.fn(),
    cancelSubscription: jest.fn(),
  },
}));

import { adminSeoSubscriptionService } from "@/services/admin/seo-packages-subscription.service";

const service = adminSeoSubscriptionService as jest.Mocked<typeof adminSeoSubscriptionService>;

async function renderPage(notice?: string) {
  render(<AdminSeoSubscriptionDetail subscription_id={7} notice={notice} />);
  await screen.findByText("Payment history");
  await waitFor(() => expect(service.listClientPaymentProfiles).toHaveBeenCalledWith(4));
}

beforeEach(() => {
  jest.clearAllMocks();
  freezeToday(new Date(2026, 10, 22, 10, 0));
  service.fetchSubscriptionDetail.mockResolvedValue(makeDetail({ charges: [makeCharge()] }));
  service.listClientPaymentProfiles.mockResolvedValue([makeCard()]);
});

afterEach(() => {
  jest.useRealTimers();
});

describe("AdminSeoSubscriptionDetail", () => {
  it("shows the plan, price, client company and billing overview", async () => {
    await renderPage();

    expect(service.fetchSubscriptionDetail).toHaveBeenCalledWith(7);
    // The hero shows the client and company (the name also appears on the card chip).
    expect(screen.getByText("cathleen@example.com, Printed Image")).toBeInTheDocument();
    expect(screen.getAllByText("Cathleen Siech").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Custom SEO Package").length).toBeGreaterThan(0);
    expect(screen.getByText("Auto renew on")).toBeInTheDocument();
    expect(screen.getByText("Custom price")).toBeInTheDocument();
    expect(screen.getAllByText("Dec 1, 2026").length).toBeGreaterThan(0);
    expect(screen.getAllByText("$2,000.00").length).toBeGreaterThan(0);
  });

  it("lists every billing period with its invoice", async () => {
    service.fetchSubscriptionDetail.mockResolvedValue(
      makeDetail({
        charges: [
          makeCharge({
            id: 2,
            period_label: "December 2026",
            period_start: "2026-12-01",
            period_end: "2026-12-31",
            status: "failed",
            attempt_count: 2,
            paid_at: null,
            failure_message: "Your card has insufficient funds.",
            next_retry_at: "2026-12-09T15:00:00+00:00",
            invoice: { id: "inv-2", unique_id: "DEF456", invoice_number: "BSM-1043", status: "unpaid", total_amount: 2000 },
          }),
          makeCharge({ trigger: "manual", charged_by: { id: 1, name: "Abigail Admin" } }),
        ],
      })
    );
    await renderPage();

    expect(screen.getByText("2 periods")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.getByText("Paid")).toBeInTheDocument();
    expect(screen.getByText("2 attempts")).toBeInTheDocument();
    expect(screen.getByText(/Automatic retry on December 9/)).toBeInTheDocument();
    expect(screen.getByText("Charged by admin (Abigail Admin)")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Invoice #BSM-1043" })).toHaveAttribute("href", "/admin/invoices/inv-2");
  });

  it("explains what happens when a subscription has no payments yet", async () => {
    service.fetchSubscriptionDetail.mockResolvedValue(makeDetail({ charges: [] }));
    await renderPage();

    expect(screen.getByText("No payments yet")).toBeInTheDocument();
  });

  it("explains a failed renewal with the decline reason, the balance and every way to resolve it", async () => {
    const invoice = { id: "inv-1", unique_id: "ABC123", invoice_number: "BSM-1042", status: "unpaid" };
    service.fetchSubscriptionDetail.mockResolvedValue(
      makeDetail({
        payment_status: "past_due",
        payment_health: makeHealth({
          state: "payment_failed",
          severity: "critical",
          overdue_periods: 2,
          overdue_amount: 4000,
          oldest_due_date: "2026-10-01",
          days_overdue: 52,
          suggest_cancellation: true,
          open_invoice: invoice,
          failure: {
            charge_id: 1,
            period_label: "November 2026",
            period_start: "2026-11-01",
            amount: 2000,
            code: "insufficient_funds",
            message: "Your card has insufficient funds.",
            client_reason: "Your bank declined the payment due to insufficient funds.",
            attempt_count: 4,
            max_attempts: 4,
            last_attempt_at: "2026-11-16T15:00:00Z",
            next_retry_at: null,
            is_retryable: true,
            card_label: "Visa ending in 4242",
          },
        }),
        charges: [makeCharge({ period_label: "November 2026", status: "failed", next_retry_at: null })],
      })
    );
    await renderPage();

    const card = screen.getByRole("alert", { name: "Automatic renewal failed, action needed" });
    expect(within(card).getByText(/Automatic retries stopped after 4 attempts/)).toBeInTheDocument();
    expect(within(card).getByText("$4,000.00")).toBeInTheDocument();
    expect(within(card).getByText("Insufficient funds")).toBeInTheDocument();
    expect(within(card).getByText("Your card has insufficient funds.")).toBeInTheDocument();
    expect(within(card).getByText("Your bank declined the payment due to insufficient funds.")).toBeInTheDocument();
    expect(within(card).getByText(/You can keep trying to collect, or cancel the subscription now/)).toBeInTheDocument();
    expect(within(card).getByRole("link", { name: /Invoice #BSM-1042/ })).toHaveAttribute("href", "/admin/invoices/inv-1");
    expect(within(card).getByRole("link", { name: /Retry payment now/ })).toHaveAttribute(
      "href",
      "/admin/seo-packages-subscriptions/7/charge"
    );

    fireEvent.click(within(card).getByRole("button", { name: /Cancel subscription/ }));
    expect(await screen.findByRole("alertdialog", { name: "Cancel subscription?" })).toBeInTheDocument();
    expect(screen.getByText(/2 months behind with \$4,000.00 outstanding/)).toBeInTheDocument();
  });

  it("shows a pending payment when billing dates passed without a charge", async () => {
    service.fetchSubscriptionDetail.mockResolvedValue(
      makeDetail({
        auto_renew: false,
        payment_health: makeHealth({
          state: "payment_pending",
          severity: "warning",
          overdue_periods: 1,
          overdue_amount: 2000,
          oldest_due_date: "2026-11-01",
          days_overdue: 21,
        }),
      })
    );
    await renderPage();

    expect(screen.getByRole("status", { name: "Payment pending for 1 month" })).toBeInTheDocument();
    expect(screen.getByText(/Billing is manual and no charge was made since November 1, 2026/)).toBeInTheDocument();
  });

  it("does not show the payment health card while payments are up to date", async () => {
    service.fetchSubscriptionDetail.mockResolvedValue(makeDetail({ payment_health: makeHealth() }));
    await renderPage();

    expect(screen.queryByText(/Why it failed/)).not.toBeInTheDocument();
    expect(screen.queryByRole("status", { name: /Payment pending/ })).not.toBeInTheDocument();
  });

  it("lets the admin void the open invoices when cancelling", async () => {
    service.fetchSubscriptionDetail.mockResolvedValue(
      makeDetail(
        { payment_health: makeHealth() },
        { open_invoices: [{ id: "inv-1", unique_id: "ABC123", invoice_number: "BSM-1042", status: "unpaid", total_amount: 2000 }] }
      )
    );
    service.cancelSubscription.mockResolvedValue(makeDetail().data);
    await renderPage();

    fireEvent.click(screen.getByRole("button", { name: /Cancel subscription/ }));
    const dialog = await screen.findByRole("alertdialog", { name: "Cancel subscription?" });
    expect(within(dialog).getByText(/1 unpaid invoice \(\$2,000.00\) stay open/)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("radio", { name: /Void them/ }));
    expect(within(dialog).getByText(/will be voided and can no longer be paid/)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: /Yes, cancel/ }));
    await waitFor(() =>
      expect(service.cancelSubscription).toHaveBeenCalledWith(7, { notes: undefined, void_open_invoices: true })
    );
  });

  it("links to the edit page", async () => {
    await renderPage();

    expect(screen.getByRole("link", { name: /Edit subscription/ })).toHaveAttribute(
      "href",
      "/admin/seo-packages-subscriptions/7/edit"
    );
  });

  it.each([
    ["activated", "Subscription activated. The billing schedule is shown below."],
    ["activated_charged", "Subscription activated and the first payment was collected."],
    [
      "activated_paid_outside",
      "Subscription activated. The first month was recorded as paid, so the client will not be charged for it.",
    ],
    ["updated", "Subscription updated. Changes apply from the next payment."],
  ])("shows the %s notice after a redirect", async (notice, text) => {
    await renderPage(notice);

    expect(screen.getByRole("status")).toHaveTextContent(text);
  });

  it("ignores unknown notices", async () => {
    await renderPage("something_else");

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("turns auto renew off right away", async () => {
    service.updateSubscription.mockResolvedValue(makeDetail({ auto_renew: false, auto_renew_disabled_at: "2026-11-22T10:00:00+00:00" }));
    await renderPage();

    fireEvent.click(screen.getByRole("switch", { name: /Auto renew every month/ }));

    await waitFor(() => expect(service.updateSubscription).toHaveBeenCalledWith(7, { auto_renew: false }));
    expect(await screen.findByRole("status")).toHaveTextContent("Auto renew turned off.");
    expect(screen.getByText("Manual billing")).toBeInTheDocument();
  });

  it("turns the renewal reminder email off", async () => {
    service.updateSubscription.mockResolvedValue(makeDetail({ reminder_days_before: null }));
    await renderPage();

    fireEvent.click(screen.getByRole("switch", { name: "Send renewal reminder email" }));

    await waitFor(() => expect(service.updateSubscription).toHaveBeenCalledWith(7, { reminder_days_before: null }));
    expect(await screen.findByRole("status")).toHaveTextContent("Renewal reminder email turned off.");
  });

  it("changes how many days before the charge the reminder goes out", async () => {
    service.updateSubscription.mockResolvedValue(makeDetail({ reminder_days_before: 7 }));
    await renderPage();

    fireEvent.click(screen.getByRole("radio", { name: "7 days before" }));

    await waitFor(() => expect(service.updateSubscription).toHaveBeenCalledWith(7, { reminder_days_before: 7 }));
    expect(await screen.findByRole("status")).toHaveTextContent("Renewal reminder set to 7 days before.");
  });

  it("shows the API error when a setting cannot be saved", async () => {
    service.updateSubscription.mockRejectedValue({
      errors: { auto_renew: ["This client has no card on file."] },
    });
    service.fetchSubscriptionDetail.mockResolvedValue(makeDetail({ auto_renew: false }));
    await renderPage();

    fireEvent.click(screen.getByRole("switch", { name: /Auto renew every month/ }));

    expect(await screen.findByRole("status")).toHaveTextContent("This client has no card on file.");
  });

  it("moves the next charge date only after Save", async () => {
    service.updateSubscription.mockResolvedValue(makeDetail({ next_billing_date: "2026-12-15", billing_anchor_day: 15 }));
    await renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Next charge date" }));
    fireEvent.click(screen.getByRole("gridcell", { name: "Tuesday, December 15, 2026" }));
    expect(service.updateSubscription).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    // The browser timezone goes along, so "today" is never rejected as a past date.
    await waitFor(() =>
      expect(service.updateSubscription).toHaveBeenCalledWith(7, {
        next_billing_date: "2026-12-15",
        timezone: BROWSER_TIMEZONE,
      })
    );
  });

  it("shows the API error when the date is moved into a month that is already paid", async () => {
    service.updateSubscription.mockRejectedValue({
      errors: { next_billing_date: ["December 2026 is already paid. Pick a date in a later month so the client is not charged twice."] },
    });
    await renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Next charge date" }));
    fireEvent.click(screen.getByRole("gridcell", { name: "Tuesday, December 15, 2026" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("status")).toHaveTextContent("December 2026 is already paid.");
  });

  it("labels a month recorded as paid outside the portal", async () => {
    service.fetchSubscriptionDetail.mockResolvedValue(
      makeDetail({
        charges: [makeCharge({ trigger: "external", charged_by: { id: 1, name: "Abigail Admin" }, card_label: null })],
      })
    );
    await renderPage();

    expect(screen.getByText("Paid outside the portal (Abigail Admin)")).toBeInTheDocument();
  });

  it("keeps the label for an invoice the client paid from the portal", async () => {
    service.fetchSubscriptionDetail.mockResolvedValue(
      makeDetail({ charges: [makeCharge({ trigger: "external", charged_by: null })] })
    );
    await renderPage();

    expect(screen.getByText("Paid by client")).toBeInTheDocument();
  });

  it("opens the charge page from Charge now", async () => {
    await renderPage();

    expect(screen.getByRole("link", { name: /^Charge now$/ })).toHaveAttribute(
      "href",
      "/admin/seo-packages-subscriptions/7/charge"
    );
  });

  it("offers a retry instead when the subscription is past due", async () => {
    service.fetchSubscriptionDetail.mockResolvedValue(makeDetail({ payment_status: "past_due", payment_health: makeHealth() }));
    await renderPage();

    expect(screen.getAllByRole("link", { name: /Retry payment now/ })[0]).toHaveAttribute(
      "href",
      "/admin/seo-packages-subscriptions/7/charge"
    );
    expect(screen.queryByRole("link", { name: /^Charge now$/ })).not.toBeInTheDocument();
  });

  it("cancels the subscription with an internal reason", async () => {
    service.cancelSubscription.mockResolvedValue(makeDetail().data);
    await renderPage();

    service.fetchSubscriptionDetail.mockResolvedValue(makeDetail({ status: "cancelled", auto_renew: false, cancelled_at: "2026-11-22T10:00:00+00:00" }));
    fireEvent.click(screen.getByRole("button", { name: /Cancel subscription/ }));
    const dialog = await screen.findByRole("alertdialog", { name: "Cancel subscription?" });
    fireEvent.change(within(dialog).getByLabelText(/Cancellation reason/), { target: { value: "Client paused SEO" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Yes, cancel" }));

    await waitFor(() => expect(service.cancelSubscription).toHaveBeenCalledWith(7, { notes: "Client paused SEO" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Subscription cancelled. No further charges will be made.");
    // Inactive subscriptions have no billing actions.
    await waitFor(() => expect(screen.queryByRole("link", { name: /^Charge now$/ })).not.toBeInTheDocument());
    expect(screen.queryByRole("link", { name: /Edit subscription/ })).not.toBeInTheDocument();
  });

  it("shows an error state when the subscription cannot be loaded", async () => {
    service.fetchSubscriptionDetail.mockRejectedValue({ message: "Subscription not found." });
    render(<AdminSeoSubscriptionDetail subscription_id={999} />);

    expect(await screen.findByText("Subscription not found.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to subscriptions" })).toHaveAttribute("href", "/admin/seo-packages-subscriptions");
  });
});
