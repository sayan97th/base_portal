/**
 * Tests for the admin "Charge Card on File" action:
 *   – ChargeCardOnFileDialog: loading the client's saved cards, preselection,
 *     the explicit confirmation gate, the charge call and its error states
 *   – AdminInvoiceDetailContent: the action only appears for chargeable invoices
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ChargeCardOnFileDialog } from "@/components/admin/invoices/InvoiceActionDialogs";
import AdminInvoiceDetailContent from "@/components/admin/invoices/AdminInvoiceDetailContent";
import type { AdminInvoice } from "@/types/admin";
import type { AdminInvoicePaymentProfile } from "@/services/admin/invoice.service";

// ─── Module mocks ─────────────────────────────────────────────────────────────

jest.mock("@/services/admin/invoice.service", () => ({
  getAdminInvoicePaymentProfiles: jest.fn(),
  chargeAdminInvoiceCardOnFile: jest.fn(),
  getAdminInvoice: jest.fn(),
  getAdminInvoiceHistory: jest.fn().mockResolvedValue([]),
  getAdminInvoiceShareLinks: jest.fn(),
  toggleAdminInvoiceSharing: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

import {
  getAdminInvoicePaymentProfiles,
  chargeAdminInvoiceCardOnFile,
  getAdminInvoice,
} from "@/services/admin/invoice.service";

const mockGetPaymentProfiles = getAdminInvoicePaymentProfiles as jest.MockedFunction<typeof getAdminInvoicePaymentProfiles>;
const mockChargeCard = chargeAdminInvoiceCardOnFile as jest.MockedFunction<typeof chargeAdminInvoiceCardOnFile>;
const mockGetAdminInvoice = getAdminInvoice as jest.MockedFunction<typeof getAdminInvoice>;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeInvoice(overrides: Partial<AdminInvoice> = {}): AdminInvoice {
  return {
    id: "inv-1",
    unique_id: "B72E1872",
    invoice_number: "BSM-0042",
    user_id: 10,
    order_id: "",
    status: "unpaid",
    payment_method: "Credit Card",
    has_stripe_payment: false,
    payment_intent_id: null,
    currency_type: "usd",
    subtotal_amount: 750,
    discount_amount: 0,
    total_amount: 750,
    credit_amount: 0,
    refund_amount: 0,
    date_issued: "2026-10-01T10:00:00Z",
    date_due: "2026-10-31T10:00:00Z",
    date_paid: null,
    created_at: "2026-10-01T10:00:00Z",
    updated_at: "2026-10-01T10:00:00Z",
    user: { id: 10, first_name: "Alice", last_name: "Walker", email: "alice@example.com" },
    line_items: [],
    billed_to: null,
    ...overrides,
  };
}

function makeProfile(overrides: Partial<AdminInvoicePaymentProfile> = {}): AdminInvoicePaymentProfile {
  return {
    id: "profile-1",
    card_brand: "visa",
    last_four: "4242",
    expiry_month: "12",
    expiry_year: "2030",
    cardholder_name: "Alice Walker",
    is_default: true,
    is_expired: false,
    ...overrides,
  };
}

function renderDialog(invoice: AdminInvoice = makeInvoice()) {
  const on_close = jest.fn();
  const on_success = jest.fn();
  render(<ChargeCardOnFileDialog invoice={invoice} onClose={on_close} onSuccess={on_success} />);
  return { on_close, on_success };
}

const chargeButton = () => screen.getByRole("button", { name: /Charge \$750\.00/i });

beforeEach(() => {
  jest.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════════
// ChargeCardOnFileDialog
// ═══════════════════════════════════════════════════════════════════════════════

describe("ChargeCardOnFileDialog", () => {
  it("shows the customer, invoice and amount", async () => {
    mockGetPaymentProfiles.mockResolvedValue([makeProfile()]);
    renderDialog();

    expect(screen.getByText("Charge Card on File")).toBeInTheDocument();
    expect(screen.getByText("Alice Walker")).toBeInTheDocument();
    expect(screen.getByText("BSM-0042")).toBeInTheDocument();
    expect(screen.getAllByText("$750.00").length).toBeGreaterThan(0);
    await screen.findByRole("radio", { name: /Visa ending in 4242/i });
    expect(mockGetPaymentProfiles).toHaveBeenCalledWith("inv-1");
  });

  it("shows a loading state while saved cards load", () => {
    mockGetPaymentProfiles.mockReturnValue(new Promise(() => {}));
    renderDialog();

    expect(screen.getByText("Loading saved cards…")).toBeInTheDocument();
  });

  it("preselects the default card and skips expired ones", async () => {
    mockGetPaymentProfiles.mockResolvedValue([
      makeProfile({ id: "expired-default", last_four: "0000", is_expired: true }),
      makeProfile({ id: "backup", last_four: "5555", card_brand: "mastercard", is_default: false }),
    ]);
    renderDialog();

    const expired_radio = await screen.findByRole("radio", { name: /Visa ending in 0000/i });
    expect(expired_radio).toBeDisabled();
    expect(expired_radio).not.toBeChecked();
    expect(screen.getByRole("radio", { name: /Mastercard ending in 5555/i })).toBeChecked();
    expect(screen.getByText("Expired")).toBeInTheDocument();
  });

  it("explains when the client has no saved cards", async () => {
    mockGetPaymentProfiles.mockResolvedValue([]);
    renderDialog();

    expect(await screen.findByText(/Alice Walker has no saved cards/)).toBeInTheDocument();
    expect(chargeButton()).toBeDisabled();
  });

  it("requires the confirmation checkbox before charging", async () => {
    mockGetPaymentProfiles.mockResolvedValue([makeProfile()]);
    renderDialog();

    await screen.findByRole("radio", { name: /Visa ending in 4242/i });
    expect(chargeButton()).toBeDisabled();

    fireEvent.click(screen.getByRole("checkbox"));
    expect(chargeButton()).toBeEnabled();
  });

  it("charges the selected card and returns the updated invoice", async () => {
    const paid_invoice = makeInvoice({ status: "paid", payment_intent_id: "pi_admin" });
    mockGetPaymentProfiles.mockResolvedValue([
      makeProfile(),
      makeProfile({ id: "profile-2", last_four: "5555", is_default: false }),
    ]);
    mockChargeCard.mockResolvedValue(paid_invoice);
    const { on_success } = renderDialog();

    fireEvent.click(await screen.findByRole("radio", { name: /ending in 5555/i }));
    fireEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByRole("checkbox").closest("label")).toHaveTextContent(/ending in 5555/);

    fireEvent.click(chargeButton());

    await waitFor(() => expect(on_success).toHaveBeenCalledWith(paid_invoice));
    expect(mockChargeCard).toHaveBeenCalledWith("inv-1", "profile-2");
  });

  it("shows the decline message from the API and stays open", async () => {
    mockGetPaymentProfiles.mockResolvedValue([makeProfile()]);
    mockChargeCard.mockRejectedValue({ message: "Your card was declined.", status_code: 402 });
    const { on_success } = renderDialog();

    await screen.findByRole("radio", { name: /Visa ending in 4242/i });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(chargeButton());

    expect(await screen.findByText("Your card was declined.")).toBeInTheDocument();
    expect(on_success).not.toHaveBeenCalled();
    expect(chargeButton()).toBeEnabled();
  });

  it("uses a fallback message for unexpected errors", async () => {
    mockGetPaymentProfiles.mockResolvedValue([makeProfile()]);
    mockChargeCard.mockRejectedValue({});
    renderDialog();

    await screen.findByRole("radio", { name: /Visa ending in 4242/i });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(chargeButton());

    expect(await screen.findByText("The card could not be charged. Please try again.")).toBeInTheDocument();
  });

  it("shows an error when saved cards fail to load", async () => {
    mockGetPaymentProfiles.mockRejectedValue({ status_code: 500 });
    renderDialog();

    expect(await screen.findByText("Failed to load the client's saved cards.")).toBeInTheDocument();
  });

  it("does not offer charging for paid or credits invoices", async () => {
    mockGetPaymentProfiles.mockResolvedValue([makeProfile()]);

    for (const invoice of [makeInvoice({ status: "paid" }), makeInvoice({ currency_type: "credits" })]) {
      const { unmount } = render(<ChargeCardOnFileDialog invoice={invoice} onClose={jest.fn()} onSuccess={jest.fn()} />);

      expect(screen.getByText("Only unpaid or overdue USD invoices can be charged to a card on file.")).toBeInTheDocument();
      expect(chargeButton()).toBeDisabled();
      unmount();
    }
  });

  it("closes with Cancel", async () => {
    mockGetPaymentProfiles.mockResolvedValue([]);
    const { on_close } = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(on_close).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// AdminInvoiceDetailContent → Actions menu
// ═══════════════════════════════════════════════════════════════════════════════

describe("AdminInvoiceDetailContent actions menu", () => {
  async function openActionsMenu(invoice: AdminInvoice) {
    mockGetAdminInvoice.mockResolvedValue(invoice);
    render(<AdminInvoiceDetailContent invoice_id={invoice.id} />);

    fireEvent.click(await screen.findByRole("button", { name: /Actions/i }));
  }

  it.each([["unpaid"], ["overdue"]] as const)("shows Charge Card on File for %s USD invoices", async (status) => {
    await openActionsMenu(makeInvoice({ status }));

    expect(screen.getByRole("button", { name: "Charge Card on File" })).toBeInTheDocument();
  });

  it.each([
    [{ status: "paid" as const }],
    [{ status: "void" as const }],
    [{ currency_type: "credits" as const }],
  ])("hides Charge Card on File for %o", async (overrides) => {
    await openActionsMenu(makeInvoice(overrides));

    expect(screen.getByRole("button", { name: "Mark as Paid" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Charge Card on File" })).not.toBeInTheDocument();
  });

  it("opens the dialog and updates the invoice after a successful charge", async () => {
    mockGetPaymentProfiles.mockResolvedValue([makeProfile()]);
    mockChargeCard.mockResolvedValue(makeInvoice({ status: "paid" }));

    await openActionsMenu(makeInvoice());
    fireEvent.click(screen.getByRole("button", { name: "Charge Card on File" }));

    await screen.findByRole("radio", { name: /Visa ending in 4242/i });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(chargeButton());

    await waitFor(() => expect(screen.queryByRole("radio", { name: /Visa ending in 4242/i })).not.toBeInTheDocument());

    // The invoice is now paid, so the action disappears from the menu.
    fireEvent.click(screen.getByRole("button", { name: /Actions/i }));
    expect(screen.queryByRole("button", { name: "Charge Card on File" })).not.toBeInTheDocument();
  });
});
