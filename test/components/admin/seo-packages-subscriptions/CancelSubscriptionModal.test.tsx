/**
 * Tests for the cancel subscription dialog
 * (CancelSubscriptionModal in src/components/admin/seo-packages-subscriptions/SubscriptionModals.tsx).
 * Admins can cancel at any time, and choose what happens to unpaid invoices.
 */

import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { CancelSubscriptionModal } from "@/components/admin/seo-packages-subscriptions/SubscriptionModals";
import type { AdminSeoSubscriptionOpenInvoice } from "@/services/admin/seo-packages-subscription.service";
import { makeHealth, makeSubscription } from "./fixtures";

jest.mock("@/services/admin/seo-packages-subscription.service", () => ({
  ...jest.requireActual("@/services/admin/seo-packages-subscription.service"),
  adminSeoSubscriptionService: {
    cancelSubscription: jest.fn(),
  },
}));

import { adminSeoSubscriptionService } from "@/services/admin/seo-packages-subscription.service";

const service = adminSeoSubscriptionService as jest.Mocked<typeof adminSeoSubscriptionService>;

const OPEN_INVOICES: AdminSeoSubscriptionOpenInvoice[] = [
  { id: "inv-1", unique_id: "ABC123", invoice_number: "BSM-1042", status: "unpaid", total_amount: 2000 },
  { id: "inv-2", unique_id: "DEF456", invoice_number: "BSM-1043", status: "overdue", total_amount: 2000 },
];

function renderModal({
  open_invoices = [] as AdminSeoSubscriptionOpenInvoice[],
  subscription = makeSubscription(),
} = {}) {
  const onClose = jest.fn();
  const onCancelled = jest.fn();
  render(
    <CancelSubscriptionModal
      subscription={subscription}
      open_invoices={open_invoices}
      onClose={onClose}
      onCancelled={onCancelled}
    />
  );
  return { onClose, onCancelled, dialog: screen.getByRole("alertdialog", { name: "Cancel subscription?" }) };
}

beforeEach(() => {
  jest.clearAllMocks();
  service.cancelSubscription.mockResolvedValue(makeSubscription({ status: "cancelled" }));
});

describe("CancelSubscriptionModal", () => {
  it("cancels without an invoice choice when nothing is owed", async () => {
    const { dialog, onCancelled } = renderModal();

    expect(within(dialog).queryByRole("radio")).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/behind with/)).not.toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: /Yes, cancel/ }));

    await waitFor(() => expect(onCancelled).toHaveBeenCalledTimes(1));
    expect(service.cancelSubscription).toHaveBeenCalledWith(7, { notes: undefined, void_open_invoices: undefined });
  });

  it("keeps unpaid invoices open by default", async () => {
    const { dialog } = renderModal({ open_invoices: OPEN_INVOICES });

    expect(within(dialog).getByRole("radio", { name: /Keep them open/ })).toBeChecked();
    expect(within(dialog).getByRole("radio", { name: /Void them/ })).not.toBeChecked();
    expect(within(dialog).getAllByText(/2 unpaid invoices \(\$4,000.00\)/).length).toBeGreaterThan(0);
    expect(within(dialog).getByText(/stay open, so the client can still pay them/)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: /Yes, cancel/ }));

    await waitFor(() =>
      expect(service.cancelSubscription).toHaveBeenCalledWith(7, { notes: undefined, void_open_invoices: false })
    );
  });

  it("voids the unpaid invoices when the admin writes the balance off", async () => {
    const { dialog } = renderModal({ open_invoices: OPEN_INVOICES });

    fireEvent.click(within(dialog).getByRole("radio", { name: /Void them/ }));

    expect(within(dialog).getByRole("radio", { name: /Void them/ })).toBeChecked();
    expect(within(dialog).getByText(/will be voided and can no longer be paid/)).toBeInTheDocument();
    expect(within(dialog).queryByText(/stay open, so the client can still pay them/)).not.toBeInTheDocument();

    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "  Client stopped paying.  " } });
    fireEvent.click(within(dialog).getByRole("button", { name: /Yes, cancel/ }));

    await waitFor(() =>
      expect(service.cancelSubscription).toHaveBeenCalledWith(7, {
        notes: "Client stopped paying.",
        void_open_invoices: true,
      })
    );
  });

  it("can switch back to keeping the invoices", async () => {
    const { dialog } = renderModal({ open_invoices: OPEN_INVOICES });

    fireEvent.click(within(dialog).getByRole("radio", { name: /Void them/ }));
    fireEvent.click(within(dialog).getByRole("radio", { name: /Keep them open/ }));
    fireEvent.click(within(dialog).getByRole("button", { name: /Yes, cancel/ }));

    await waitFor(() =>
      expect(service.cancelSubscription).toHaveBeenCalledWith(7, { notes: undefined, void_open_invoices: false })
    );
  });

  it("reminds the admin how far behind the client is", () => {
    const { dialog } = renderModal({
      subscription: makeSubscription({
        payment_health: makeHealth({
          state: "payment_pending",
          severity: "critical",
          overdue_periods: 3,
          overdue_amount: 6000,
          suggest_cancellation: true,
        }),
      }),
    });

    expect(within(dialog).getByText(/This client is 3 months behind with \$6,000.00/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Cancelling is a reasonable step/)).toBeInTheDocument();
  });

  it("does not show the balance notice for a missing card that owes nothing", () => {
    const { dialog } = renderModal({
      subscription: makeSubscription({
        payment_health: makeHealth({ state: "no_payment_method", severity: "warning", card_issue: "missing" }),
      }),
    });

    expect(within(dialog).queryByText(/behind with/)).not.toBeInTheDocument();
  });

  it("shows the API error and stays open", async () => {
    service.cancelSubscription.mockRejectedValue({ message: "Only active subscriptions can be cancelled." });
    const { dialog, onCancelled } = renderModal({ open_invoices: OPEN_INVOICES });

    fireEvent.click(within(dialog).getByRole("button", { name: /Yes, cancel/ }));

    expect(await within(dialog).findByText("Only active subscriptions can be cancelled.")).toBeInTheDocument();
    expect(onCancelled).not.toHaveBeenCalled();
    expect(within(dialog).getByRole("button", { name: /Yes, cancel/ })).toBeEnabled();
  });

  it("locks the invoice choice while cancelling", async () => {
    let resolve_cancel: (value: unknown) => void = () => {};
    service.cancelSubscription.mockReturnValue(new Promise((resolve) => (resolve_cancel = resolve)) as never);
    const { dialog, onCancelled } = renderModal({ open_invoices: OPEN_INVOICES });

    fireEvent.click(within(dialog).getByRole("button", { name: /Yes, cancel/ }));

    expect(await within(dialog).findByText("Cancelling...")).toBeInTheDocument();
    within(dialog).getAllByRole("radio").forEach((radio) => expect(radio).toBeDisabled());

    resolve_cancel(makeSubscription({ status: "cancelled" }));
    await waitFor(() => expect(onCancelled).toHaveBeenCalled());
  });

  it("keeps the subscription when the admin backs out", () => {
    const { dialog, onClose } = renderModal({ open_invoices: OPEN_INVOICES });

    fireEvent.click(within(dialog).getByRole("button", { name: "Keep active" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(service.cancelSubscription).not.toHaveBeenCalled();
  });
});
