/**
 * Tests for the SEO subscription page
 * (src/components/admin/seo-packages-subscriptions/AdminSeoSubscriptionDetail.tsx):
 * payment history, billing settings that save instantly, manual charge,
 * cancellation and the messages shown after creating or editing.
 */

import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import AdminSeoSubscriptionDetail from "@/components/admin/seo-packages-subscriptions/AdminSeoSubscriptionDetail";
import { freezeToday, makeCard, makeCharge, makeDetail } from "./fixtures";

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
    expect(screen.getByText("cathleen@example.com · Printed Image")).toBeInTheDocument();
    expect(screen.getAllByText("Cathleen Siech").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Custom SEO Package").length).toBeGreaterThan(0);
    expect(screen.getByText("Auto renew on")).toBeInTheDocument();
    expect(screen.getByText("Custom price")).toBeInTheDocument();
    expect(screen.getByText("December 1, 2026")).toBeInTheDocument();
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

    expect(screen.getByText("2 billing periods")).toBeInTheDocument();
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

  it("warns about a past due payment and offers to retry it", async () => {
    service.fetchSubscriptionDetail.mockResolvedValue(
      makeDetail({
        payment_status: "past_due",
        charges: [
          makeCharge({
            period_label: "November 2026",
            status: "failed",
            failure_message: "The card was declined.",
            next_retry_at: null,
            invoice: { id: "inv-1", unique_id: "ABC123", invoice_number: "BSM-1042", status: "unpaid", total_amount: 2000 },
          }),
        ],
      })
    );
    await renderPage();

    expect(screen.getByText("The November 2026 payment failed.")).toBeInTheDocument();
    expect(screen.getByText(/Automatic retries have stopped/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View invoice #BSM-1042" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Retry payment now/ })).toBeInTheDocument();
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

    await waitFor(() => expect(service.updateSubscription).toHaveBeenCalledWith(7, { next_billing_date: "2026-12-15" }));
  });

  it("charges the card on file manually", async () => {
    service.chargeNow.mockResolvedValue({
      ...makeDetail({ next_billing_date: "2027-01-01" }),
      message: "Charged $2000.00 for December 2026.",
    });
    await renderPage();

    fireEvent.click(screen.getByRole("button", { name: /^Charge now$/ }));
    const dialog_heading = screen.getByRole("heading", { name: "Charge $2,000 now?" });
    const dialog = dialog_heading.closest("div.relative") as HTMLElement;

    // December is not due yet: the admin is told the schedule moves forward.
    expect(within(dialog).getByText(/This period is not due until December 1/)).toBeInTheDocument();
    expect(within(dialog).getByRole("radio", { name: /Visa •••• 4242/ })).toBeChecked();

    fireEvent.click(within(dialog).getByRole("button", { name: "Charge $2,000.00" }));

    await waitFor(() => expect(service.chargeNow).toHaveBeenCalledWith(7, "card-1"));
    expect(await screen.findByRole("status")).toHaveTextContent("Charged $2000.00 for December 2026.");
    expect(screen.queryByRole("heading", { name: "Charge $2,000 now?" })).not.toBeInTheDocument();
  });

  it("keeps the charge dialog open with the decline reason and refreshes the history", async () => {
    service.chargeNow.mockRejectedValue({ message: "The card was declined." });
    await renderPage();
    expect(service.fetchSubscriptionDetail).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /^Charge now$/ }));
    fireEvent.click(screen.getByRole("button", { name: "Charge $2,000.00" }));

    expect(await screen.findByText("The card was declined.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Charge $2,000 now?" })).toBeInTheDocument();
    await waitFor(() => expect(service.fetchSubscriptionDetail).toHaveBeenCalledTimes(2));
  });

  it("cannot charge when the client has no valid card", async () => {
    service.listClientPaymentProfiles.mockResolvedValue([makeCard({ is_expired: true })]);
    await renderPage();

    fireEvent.click(screen.getByRole("button", { name: /^Charge now$/ }));

    expect(screen.getByText(/No valid card on file/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Charge $2,000.00" })).toBeDisabled();
  });

  it("cancels the subscription with an internal reason", async () => {
    service.cancelSubscription.mockResolvedValue(makeDetail().data);
    await renderPage();

    service.fetchSubscriptionDetail.mockResolvedValue(makeDetail({ status: "cancelled", auto_renew: false, cancelled_at: "2026-11-22T10:00:00+00:00" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel subscription" }));
    fireEvent.change(screen.getByPlaceholderText("Reason (optional, internal)"), { target: { value: "Client paused SEO" } });
    fireEvent.click(screen.getByRole("button", { name: "Yes, cancel" }));

    await waitFor(() => expect(service.cancelSubscription).toHaveBeenCalledWith(7, { notes: "Client paused SEO" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Subscription cancelled. No further charges will be made.");
    // Inactive subscriptions have no billing actions.
    await waitFor(() => expect(screen.queryByRole("button", { name: /^Charge now$/ })).not.toBeInTheDocument());
    expect(screen.queryByRole("link", { name: /Edit subscription/ })).not.toBeInTheDocument();
  });

  it("shows an error state when the subscription cannot be loaded", async () => {
    service.fetchSubscriptionDetail.mockRejectedValue({ message: "Subscription not found." });
    render(<AdminSeoSubscriptionDetail subscription_id={999} />);

    expect(await screen.findByText("Subscription not found.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to subscriptions" })).toHaveAttribute("href", "/admin/seo-packages-subscriptions");
  });
});
