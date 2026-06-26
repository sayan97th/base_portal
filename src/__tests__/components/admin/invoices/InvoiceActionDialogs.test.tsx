/**
 * Tests for RefundInvoiceDialog and PartialRefundInvoiceDialog.
 *
 * Both dialogs are multi-step (form → confirm) and gate submission behind an
 * explicit acknowledgement checkbox. The suite verifies:
 *   – status guards block the action for ineligible invoices
 *   – the form step validates input before advancing to confirm
 *   – the confirmation step requires the acknowledgement checkbox
 *   – the correct service function is called with the right payload
 *   – the notify-client toggle is forwarded to the service
 *   – success and error states render correctly
 */

import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  RefundInvoiceDialog,
  PartialRefundInvoiceDialog,
} from "@/components/admin/invoices/InvoiceActionDialogs";
import {
  refundAdminInvoice,
  partialRefundAdminInvoice,
} from "@/services/admin/invoice.service";
import type { AdminInvoice } from "@/types/admin";

// ─── Module mocks ─────────────────────────────────────────────────────────────

jest.mock("@/services/admin/invoice.service", () => ({
  refundAdminInvoice: jest.fn(),
  partialRefundAdminInvoice: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const mockRefundAdminInvoice = refundAdminInvoice as jest.MockedFunction<typeof refundAdminInvoice>;
const mockPartialRefundAdminInvoice = partialRefundAdminInvoice as jest.MockedFunction<typeof partialRefundAdminInvoice>;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeInvoice(overrides: Partial<AdminInvoice> = {}): AdminInvoice {
  return {
    id: "inv-1",
    unique_id: "ABCD1234",
    invoice_number: "BSM-0001",
    user_id: 10,
    order_id: "",
    status: "paid",
    payment_method: "Credit Card",
    has_stripe_payment: true,
    payment_intent_id: "pi_test_abc",
    currency_type: "usd",
    subtotal_amount: 500,
    discount_amount: 0,
    total_amount: 500,
    credit_amount: 0,
    refund_amount: 0,
    date_issued: "2026-06-01T10:00:00Z",
    date_due: "2026-06-30T10:00:00Z",
    date_paid: "2026-06-01T10:00:00Z",
    created_at: "2026-06-01T10:00:00Z",
    updated_at: "2026-06-01T10:00:00Z",
    user: { id: 10, first_name: "Alice", last_name: "Walker", email: "alice@example.com" },
    line_items: [],
    billed_to: null,
    ...overrides,
  };
}

const noop = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════════
// RefundInvoiceDialog
// ═══════════════════════════════════════════════════════════════════════════════

describe("RefundInvoiceDialog", () => {
  // ─── Rendering ───────────────────────────────────────────────────────────────

  it("renders with the Refund Invoice title", () => {
    render(<RefundInvoiceDialog invoice={makeInvoice()} onClose={noop} onSuccess={noop} />);
    expect(screen.getByText("Refund Invoice")).toBeInTheDocument();
  });

  it("shows the refund summary for a paid card invoice", () => {
    render(<RefundInvoiceDialog invoice={makeInvoice()} onClose={noop} onSuccess={noop} />);
    expect(screen.getByText(/Stripe refund/i)).toBeInTheDocument();
    expect(screen.getByText("Alice Walker")).toBeInTheDocument();
    expect(screen.getByText("BSM-0001")).toBeInTheDocument();
  });

  it("shows credit-refund indicator for credit-paid invoice", () => {
    const invoice = makeInvoice({
      payment_method: "Account Balance",
      has_stripe_payment: false,
      credit_amount: 500,
    });
    render(<RefundInvoiceDialog invoice={invoice} onClose={noop} onSuccess={noop} />);
    expect(screen.getByText(/Credit refund/i)).toBeInTheDocument();
  });

  it("shows mixed-payment indicator when both credits and card were used", () => {
    const invoice = makeInvoice({
      total_amount: 500,
      credit_amount: 200,
      has_stripe_payment: true,
    });
    render(<RefundInvoiceDialog invoice={invoice} onClose={noop} onSuccess={noop} />);
    // Both credit and card banners are rendered in the mixed-payment layout
    expect(screen.getByText(/Credits \(\$200\.00\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Card \(\$300\.00\)/i)).toBeInTheDocument();
  });

  it("blocks refund and shows status guard for a non-paid invoice", () => {
    render(
      <RefundInvoiceDialog
        invoice={makeInvoice({ status: "unpaid" })}
        onClose={noop}
        onSuccess={noop}
      />
    );
    expect(screen.getByText(/Refund not available/i)).toBeInTheDocument();
    // Button is rendered but disabled — user cannot proceed
    expect(screen.getByRole("button", { name: /Continue to Confirmation/i })).toBeDisabled();
  });

  it("blocks refund for an already-refunded invoice", () => {
    render(
      <RefundInvoiceDialog
        invoice={makeInvoice({ status: "refund" })}
        onClose={noop}
        onSuccess={noop}
      />
    );
    expect(screen.getByText(/Refund not available/i)).toBeInTheDocument();
  });

  // ─── Missing payment intent ───────────────────────────────────────────────────

  it("shows the PI input field when card payment has no payment intent", () => {
    const invoice = makeInvoice({
      payment_method: "Credit Card",
      has_stripe_payment: false,
      payment_intent_id: undefined,
    });
    render(<RefundInvoiceDialog invoice={invoice} onClose={noop} onSuccess={noop} />);
    expect(screen.getByPlaceholderText("pi_3…")).toBeInTheDocument();
  });

  // ─── Navigation ──────────────────────────────────────────────────────────────

  it("advances to the confirmation step when Continue is clicked on a paid invoice", async () => {
    render(<RefundInvoiceDialog invoice={makeInvoice()} onClose={noop} onSuccess={noop} />);

    fireEvent.click(screen.getByRole("button", { name: /Continue to Confirmation/i }));

    await waitFor(() => {
      expect(screen.getByText(/I understand this refund cannot be undone/i)).toBeInTheDocument();
    });
  });

  it("shows the Back button on the confirmation step", async () => {
    render(<RefundInvoiceDialog invoice={makeInvoice()} onClose={noop} onSuccess={noop} />);

    fireEvent.click(screen.getByRole("button", { name: /Continue to Confirmation/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
    });
  });

  it("returns to the form step when Back is clicked", async () => {
    render(<RefundInvoiceDialog invoice={makeInvoice()} onClose={noop} onSuccess={noop} />);

    fireEvent.click(screen.getByRole("button", { name: /Continue to Confirmation/i }));
    await waitFor(() => screen.getByRole("button", { name: "Back" }));
    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Continue to Confirmation/i })).toBeInTheDocument();
    });
  });

  // ─── Acknowledgement gate ────────────────────────────────────────────────────

  it("disables the submit button until the acknowledgement checkbox is ticked", async () => {
    render(<RefundInvoiceDialog invoice={makeInvoice()} onClose={noop} onSuccess={noop} />);

    fireEvent.click(screen.getByRole("button", { name: /Continue to Confirmation/i }));
    await waitFor(() => screen.getByText(/I understand this refund cannot be undone/i));

    const submit_btn = screen.getByRole("button", { name: /Process Stripe Refund|Process Full Refund|Refund Credits|Record Refund/i });
    expect(submit_btn).toBeDisabled();
  });

  it("enables the submit button after the acknowledgement checkbox is ticked", async () => {
    render(<RefundInvoiceDialog invoice={makeInvoice()} onClose={noop} onSuccess={noop} />);

    fireEvent.click(screen.getByRole("button", { name: /Continue to Confirmation/i }));
    await waitFor(() => screen.getByText(/I understand this refund cannot be undone/i));

    const ack_checkbox = screen.getByRole("checkbox", {
      name: /I understand this refund cannot be undone/i,
    });
    fireEvent.click(ack_checkbox);

    const submit_btn = screen.getByRole("button", { name: /Process Stripe Refund|Process Full Refund|Refund Credits|Record Refund/i });
    expect(submit_btn).not.toBeDisabled();
  });

  // ─── Service call ────────────────────────────────────────────────────────────

  it("calls refundAdminInvoice with correct id and send_client_notification=true by default", async () => {
    const invoice = makeInvoice();
    const updated = { ...invoice, status: "refund" as const };
    mockRefundAdminInvoice.mockResolvedValueOnce(updated as AdminInvoice);

    render(<RefundInvoiceDialog invoice={invoice} onClose={noop} onSuccess={noop} />);

    fireEvent.click(screen.getByRole("button", { name: /Continue to Confirmation/i }));
    await waitFor(() => screen.getByText(/I understand this refund cannot be undone/i));

    fireEvent.click(
      screen.getByRole("checkbox", { name: /I understand this refund cannot be undone/i })
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Process Stripe Refund|Process Full Refund|Refund Credits|Record Refund/i })
    );

    await waitFor(() => {
      expect(mockRefundAdminInvoice).toHaveBeenCalledWith("inv-1", {
        send_client_notification: true,
      });
    });
  });

  it("forwards send_client_notification=false when the notify toggle is unchecked", async () => {
    const invoice = makeInvoice();
    const updated = { ...invoice, status: "refund" as const };
    mockRefundAdminInvoice.mockResolvedValueOnce(updated as AdminInvoice);

    render(<RefundInvoiceDialog invoice={invoice} onClose={noop} onSuccess={noop} />);

    fireEvent.click(screen.getByRole("button", { name: /Continue to Confirmation/i }));
    await waitFor(() => screen.getByText(/Email the client about this refund/i));

    // Uncheck the notify-client toggle
    const notify_checkbox = screen.getByRole("checkbox", {
      name: /Email the client about this refund/i,
    });
    fireEvent.click(notify_checkbox);

    fireEvent.click(
      screen.getByRole("checkbox", { name: /I understand this refund cannot be undone/i })
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Process Stripe Refund|Process Full Refund|Refund Credits|Record Refund/i })
    );

    await waitFor(() => {
      expect(mockRefundAdminInvoice).toHaveBeenCalledWith("inv-1", {
        send_client_notification: false,
      });
    });
  });

  it("calls onSuccess with the updated invoice after a successful refund", async () => {
    const invoice = makeInvoice();
    const updated = { ...invoice, status: "refund" as const };
    const on_success = jest.fn();
    mockRefundAdminInvoice.mockResolvedValueOnce(updated as AdminInvoice);

    render(<RefundInvoiceDialog invoice={invoice} onClose={noop} onSuccess={on_success} />);

    fireEvent.click(screen.getByRole("button", { name: /Continue to Confirmation/i }));
    await waitFor(() => screen.getByText(/I understand this refund cannot be undone/i));
    fireEvent.click(
      screen.getByRole("checkbox", { name: /I understand this refund cannot be undone/i })
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Process Stripe Refund|Process Full Refund|Refund Credits|Record Refund/i })
    );

    await waitFor(() => {
      expect(on_success).toHaveBeenCalledWith(updated);
    });
  });

  it("displays an error banner when the refund service call fails", async () => {
    mockRefundAdminInvoice.mockRejectedValueOnce({ message: "Stripe refund failed." });

    render(<RefundInvoiceDialog invoice={makeInvoice()} onClose={noop} onSuccess={noop} />);

    fireEvent.click(screen.getByRole("button", { name: /Continue to Confirmation/i }));
    await waitFor(() => screen.getByText(/I understand this refund cannot be undone/i));
    fireEvent.click(
      screen.getByRole("checkbox", { name: /I understand this refund cannot be undone/i })
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Process Stripe Refund|Process Full Refund|Refund Credits|Record Refund/i })
    );

    await waitFor(() => {
      expect(screen.getByText("Stripe refund failed.")).toBeInTheDocument();
    });
  });

  it("shows a fallback error message when the service rejects without a message property", async () => {
    // Throw an object with no `message` key — the component falls back to its own message
    mockRefundAdminInvoice.mockRejectedValueOnce({});

    render(<RefundInvoiceDialog invoice={makeInvoice()} onClose={noop} onSuccess={noop} />);

    fireEvent.click(screen.getByRole("button", { name: /Continue to Confirmation/i }));
    await waitFor(() => screen.getByText(/I understand this refund cannot be undone/i));
    fireEvent.click(
      screen.getByRole("checkbox", { name: /I understand this refund cannot be undone/i })
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Process Stripe Refund|Process Full Refund|Refund Credits|Record Refund/i })
    );

    await waitFor(() => {
      expect(screen.getByText(/Failed to process refund/i)).toBeInTheDocument();
    });
  });

  // ─── Notify-client helper text ───────────────────────────────────────────────

  it("shows the client name in the notify-client helper text when enabled", async () => {
    render(<RefundInvoiceDialog invoice={makeInvoice()} onClose={noop} onSuccess={noop} />);

    fireEvent.click(screen.getByRole("button", { name: /Continue to Confirmation/i }));
    await waitFor(() => screen.getByText(/Alice Walker will receive a refund confirmation email/i));
  });

  it("updates the notify-client helper text when the toggle is unchecked", async () => {
    render(<RefundInvoiceDialog invoice={makeInvoice()} onClose={noop} onSuccess={noop} />);

    fireEvent.click(screen.getByRole("button", { name: /Continue to Confirmation/i }));
    await waitFor(() => screen.getByText(/Email the client about this refund/i));

    const notify_checkbox = screen.getByRole("checkbox", {
      name: /Email the client about this refund/i,
    });
    fireEvent.click(notify_checkbox);

    expect(screen.getByText(/Alice Walker will not be notified/i)).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PartialRefundInvoiceDialog
// ═══════════════════════════════════════════════════════════════════════════════

describe("PartialRefundInvoiceDialog", () => {
  // ─── Rendering ───────────────────────────────────────────────────────────────

  it("renders with the Issue Partial Refund title", () => {
    render(<PartialRefundInvoiceDialog invoice={makeInvoice()} onClose={noop} onSuccess={noop} />);
    expect(screen.getByText("Issue Partial Refund")).toBeInTheDocument();
  });

  it("shows invoice total and customer name in the refund summary", () => {
    render(<PartialRefundInvoiceDialog invoice={makeInvoice()} onClose={noop} onSuccess={noop} />);
    expect(screen.getByText("Alice Walker")).toBeInTheDocument();
    // Multiple $500.00 labels appear (Invoice Total + Remaining Refundable)
    expect(screen.getAllByText(/\$500\.00/).length).toBeGreaterThan(0);
  });

  it("shows the refund input and a Maximum label", () => {
    render(<PartialRefundInvoiceDialog invoice={makeInvoice()} onClose={noop} onSuccess={noop} />);
    expect(screen.getByPlaceholderText("0.00")).toBeInTheDocument();
    expect(screen.getByText(/Maximum:/i)).toBeInTheDocument();
  });

  // ─── Status guards ────────────────────────────────────────────────────────────

  it("shows Refund not available for an unpaid invoice", () => {
    render(
      <PartialRefundInvoiceDialog
        invoice={makeInvoice({ status: "unpaid" })}
        onClose={noop}
        onSuccess={noop}
      />
    );
    expect(screen.getByText(/Refund not available/i)).toBeInTheDocument();
  });

  it("shows Invoice fully refunded message when no balance remains", () => {
    render(
      <PartialRefundInvoiceDialog
        invoice={makeInvoice({ status: "partial_refund", refund_amount: 500 })}
        onClose={noop}
        onSuccess={noop}
      />
    );
    expect(screen.getByText(/Invoice fully refunded/i)).toBeInTheDocument();
  });

  it("allows partial refund when invoice has partial_refund status with remaining balance", () => {
    render(
      <PartialRefundInvoiceDialog
        invoice={makeInvoice({ status: "partial_refund", refund_amount: 200 })}
        onClose={noop}
        onSuccess={noop}
      />
    );
    expect(screen.getByPlaceholderText("0.00")).toBeInTheDocument();
    expect(screen.queryByText(/Refund not available/i)).toBeNull();
  });

  // ─── Already-refunded amount display ─────────────────────────────────────────

  it("shows the already-refunded amount in the summary when present", () => {
    const invoice = makeInvoice({ status: "partial_refund", refund_amount: 150 });
    render(<PartialRefundInvoiceDialog invoice={invoice} onClose={noop} onSuccess={noop} />);

    expect(screen.getByText(/Already Refunded/i)).toBeInTheDocument();
    expect(screen.getByText(/-\$150\.00/i)).toBeInTheDocument();
  });

  it("shows the remaining refundable balance correctly after prior partial refunds", () => {
    const invoice = makeInvoice({ status: "partial_refund", refund_amount: 200 });
    render(<PartialRefundInvoiceDialog invoice={invoice} onClose={noop} onSuccess={noop} />);

    expect(screen.getByText("Remaining Refundable")).toBeInTheDocument();
    // $300.00 is the remaining balance (500 - 200); use getAllByText to handle duplicate amounts
    expect(screen.getAllByText("$300.00").length).toBeGreaterThan(0);
  });

  // ─── Amount input validation ─────────────────────────────────────────────────

  it("shows an inline over-limit warning when the amount exceeds the remaining balance", async () => {
    render(
      <PartialRefundInvoiceDialog
        invoice={makeInvoice({ total_amount: 300, refund_amount: 0 })}
        onClose={noop}
        onSuccess={noop}
      />
    );

    const input = screen.getByPlaceholderText("0.00");
    await userEvent.type(input, "999");

    await waitFor(() => {
      expect(
        screen.getByText(/Amount exceeds the remaining refundable balance/i)
      ).toBeInTheDocument();
    });
  });

  it("does not advance to confirm step when amount is empty", async () => {
    render(<PartialRefundInvoiceDialog invoice={makeInvoice()} onClose={noop} onSuccess={noop} />);

    fireEvent.click(screen.getByRole("button", { name: /Continue to Confirmation/i }));

    // The confirm step must NOT appear — acknowledgement checkbox is only in the confirm step
    await waitFor(() => {
      expect(screen.queryByText(/I understand this refund cannot be undone/i)).toBeNull();
    });
    // The form step should still be active
    expect(screen.getByPlaceholderText("0.00")).toBeInTheDocument();
  });

  it("does not advance when amount exceeds remaining balance", async () => {
    render(
      <PartialRefundInvoiceDialog
        invoice={makeInvoice({ total_amount: 200 })}
        onClose={noop}
        onSuccess={noop}
      />
    );

    const input = screen.getByPlaceholderText("0.00");
    await userEvent.type(input, "999");
    fireEvent.click(screen.getByRole("button", { name: /Continue to Confirmation/i }));

    await waitFor(() => {
      expect(screen.getByText(/Amount exceeds the remaining refundable balance/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/I understand this refund cannot be undone/i)).toBeNull();
  });

  // ─── Refund full balance shortcut ─────────────────────────────────────────────

  it("fills the input with the full remaining balance when the shortcut button is clicked", async () => {
    const invoice = makeInvoice({ total_amount: 400, refund_amount: 100 });
    render(<PartialRefundInvoiceDialog invoice={invoice} onClose={noop} onSuccess={noop} />);

    fireEvent.click(screen.getByRole("button", { name: /Refund full balance/i }));

    const input = screen.getByPlaceholderText("0.00") as HTMLInputElement;
    expect(input.value).toBe("300");
  });

  // ─── Navigation ──────────────────────────────────────────────────────────────

  it("advances to the confirmation step with a valid amount", async () => {
    render(<PartialRefundInvoiceDialog invoice={makeInvoice()} onClose={noop} onSuccess={noop} />);

    const input = screen.getByPlaceholderText("0.00");
    await userEvent.type(input, "150");
    fireEvent.click(screen.getByRole("button", { name: /Continue to Confirmation/i }));

    await waitFor(() => {
      expect(screen.getByText(/I understand this refund cannot be undone/i)).toBeInTheDocument();
    });
  });

  it("shows the refund amount in the confirmation summary", async () => {
    render(<PartialRefundInvoiceDialog invoice={makeInvoice()} onClose={noop} onSuccess={noop} />);

    const input = screen.getByPlaceholderText("0.00");
    await userEvent.type(input, "250");
    fireEvent.click(screen.getByRole("button", { name: /Continue to Confirmation/i }));

    await waitFor(() => {
      expect(screen.getByText("This Refund")).toBeInTheDocument();
      expect(screen.getByText("$250.00")).toBeInTheDocument();
    });
  });

  it("returns to the form step when Back is clicked on the confirmation step", async () => {
    render(<PartialRefundInvoiceDialog invoice={makeInvoice()} onClose={noop} onSuccess={noop} />);

    const input = screen.getByPlaceholderText("0.00");
    await userEvent.type(input, "100");
    fireEvent.click(screen.getByRole("button", { name: /Continue to Confirmation/i }));
    await waitFor(() => screen.getByRole("button", { name: "Back" }));
    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("0.00")).toBeInTheDocument();
    });
  });

  // ─── Acknowledgement gate ────────────────────────────────────────────────────

  it("disables the submit button on the confirmation step until acknowledgement is ticked", async () => {
    render(<PartialRefundInvoiceDialog invoice={makeInvoice()} onClose={noop} onSuccess={noop} />);

    const input = screen.getByPlaceholderText("0.00");
    await userEvent.type(input, "100");
    fireEvent.click(screen.getByRole("button", { name: /Continue to Confirmation/i }));
    await waitFor(() => screen.getByText(/I understand this refund cannot be undone/i));

    const submit_btn = screen.getByRole("button", {
      name: /Refund Credits|Issue Stripe Refund|Issue Refund|Record Refund/i,
    });
    expect(submit_btn).toBeDisabled();
  });

  it("enables submit after acknowledgement is ticked", async () => {
    render(<PartialRefundInvoiceDialog invoice={makeInvoice()} onClose={noop} onSuccess={noop} />);

    const input = screen.getByPlaceholderText("0.00");
    await userEvent.type(input, "100");
    fireEvent.click(screen.getByRole("button", { name: /Continue to Confirmation/i }));
    await waitFor(() => screen.getByText(/I understand this refund cannot be undone/i));

    fireEvent.click(
      screen.getByRole("checkbox", { name: /I understand this refund cannot be undone/i })
    );

    const submit_btn = screen.getByRole("button", {
      name: /Refund Credits|Issue Stripe Refund|Issue Refund|Record Refund/i,
    });
    expect(submit_btn).not.toBeDisabled();
  });

  // ─── Service call ────────────────────────────────────────────────────────────

  it("calls partialRefundAdminInvoice with correct id, amount, and send_client_notification=true", async () => {
    const invoice = makeInvoice();
    const updated = { ...invoice, status: "partial_refund" as const, refund_amount: 150 };
    mockPartialRefundAdminInvoice.mockResolvedValueOnce(updated as AdminInvoice);

    render(<PartialRefundInvoiceDialog invoice={invoice} onClose={noop} onSuccess={noop} />);

    const input = screen.getByPlaceholderText("0.00");
    await userEvent.type(input, "150");
    fireEvent.click(screen.getByRole("button", { name: /Continue to Confirmation/i }));
    await waitFor(() => screen.getByText(/I understand this refund cannot be undone/i));

    fireEvent.click(
      screen.getByRole("checkbox", { name: /I understand this refund cannot be undone/i })
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: /Refund Credits|Issue Stripe Refund|Issue Refund|Record Refund/i,
      })
    );

    await waitFor(() => {
      expect(mockPartialRefundAdminInvoice).toHaveBeenCalledWith("inv-1", 150, {
        send_client_notification: true,
      });
    });
  });

  it("forwards send_client_notification=false when notify toggle is unchecked", async () => {
    const invoice = makeInvoice();
    const updated = { ...invoice, status: "partial_refund" as const, refund_amount: 100 };
    mockPartialRefundAdminInvoice.mockResolvedValueOnce(updated as AdminInvoice);

    render(<PartialRefundInvoiceDialog invoice={invoice} onClose={noop} onSuccess={noop} />);

    const input = screen.getByPlaceholderText("0.00");
    await userEvent.type(input, "100");
    fireEvent.click(screen.getByRole("button", { name: /Continue to Confirmation/i }));
    await waitFor(() => screen.getByText(/Email the client about this refund/i));

    // Uncheck the notify-client toggle
    fireEvent.click(
      screen.getByRole("checkbox", { name: /Email the client about this refund/i })
    );
    fireEvent.click(
      screen.getByRole("checkbox", { name: /I understand this refund cannot be undone/i })
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: /Refund Credits|Issue Stripe Refund|Issue Refund|Record Refund/i,
      })
    );

    await waitFor(() => {
      expect(mockPartialRefundAdminInvoice).toHaveBeenCalledWith("inv-1", 100, {
        send_client_notification: false,
      });
    });
  });

  it("calls onSuccess with the updated invoice after successful partial refund", async () => {
    const invoice = makeInvoice();
    const updated = { ...invoice, status: "partial_refund" as const, refund_amount: 200 };
    const on_success = jest.fn();
    mockPartialRefundAdminInvoice.mockResolvedValueOnce(updated as AdminInvoice);

    render(<PartialRefundInvoiceDialog invoice={invoice} onClose={noop} onSuccess={on_success} />);

    const input = screen.getByPlaceholderText("0.00");
    await userEvent.type(input, "200");
    fireEvent.click(screen.getByRole("button", { name: /Continue to Confirmation/i }));
    await waitFor(() => screen.getByText(/I understand this refund cannot be undone/i));
    fireEvent.click(
      screen.getByRole("checkbox", { name: /I understand this refund cannot be undone/i })
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: /Refund Credits|Issue Stripe Refund|Issue Refund|Record Refund/i,
      })
    );

    await waitFor(() => {
      expect(on_success).toHaveBeenCalledWith(updated);
    });
  });

  // ─── Success state ────────────────────────────────────────────────────────────

  it("shows the success state with Refund processed message after successful submit", async () => {
    const invoice = makeInvoice();
    const updated = { ...invoice, status: "partial_refund" as const, refund_amount: 100 };
    mockPartialRefundAdminInvoice.mockResolvedValueOnce(updated as AdminInvoice);

    render(<PartialRefundInvoiceDialog invoice={invoice} onClose={noop} onSuccess={noop} />);

    const input = screen.getByPlaceholderText("0.00");
    await userEvent.type(input, "100");
    fireEvent.click(screen.getByRole("button", { name: /Continue to Confirmation/i }));
    await waitFor(() => screen.getByText(/I understand this refund cannot be undone/i));
    fireEvent.click(
      screen.getByRole("checkbox", { name: /I understand this refund cannot be undone/i })
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: /Refund Credits|Issue Stripe Refund|Issue Refund|Record Refund/i,
      })
    );

    await waitFor(() => {
      expect(screen.getByText(/Refund processed successfully/i)).toBeInTheDocument();
    });
  });

  it("shows a Close button on the success state", async () => {
    const invoice = makeInvoice();
    const updated = { ...invoice, status: "partial_refund" as const, refund_amount: 100 };
    mockPartialRefundAdminInvoice.mockResolvedValueOnce(updated as AdminInvoice);

    render(<PartialRefundInvoiceDialog invoice={invoice} onClose={noop} onSuccess={noop} />);

    const input = screen.getByPlaceholderText("0.00");
    await userEvent.type(input, "100");
    fireEvent.click(screen.getByRole("button", { name: /Continue to Confirmation/i }));
    await waitFor(() => screen.getByText(/I understand this refund cannot be undone/i));
    fireEvent.click(
      screen.getByRole("checkbox", { name: /I understand this refund cannot be undone/i })
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: /Refund Credits|Issue Stripe Refund|Issue Refund|Record Refund/i,
      })
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    });
  });

  // ─── Error state ─────────────────────────────────────────────────────────────

  it("displays an error banner when the partial refund service call fails", async () => {
    mockPartialRefundAdminInvoice.mockRejectedValueOnce({
      message: "Stripe partial refund failed.",
    });

    render(<PartialRefundInvoiceDialog invoice={makeInvoice()} onClose={noop} onSuccess={noop} />);

    const input = screen.getByPlaceholderText("0.00");
    await userEvent.type(input, "100");
    fireEvent.click(screen.getByRole("button", { name: /Continue to Confirmation/i }));
    await waitFor(() => screen.getByText(/I understand this refund cannot be undone/i));
    fireEvent.click(
      screen.getByRole("checkbox", { name: /I understand this refund cannot be undone/i })
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: /Refund Credits|Issue Stripe Refund|Issue Refund|Record Refund/i,
      })
    );

    await waitFor(() => {
      expect(screen.getByText("Stripe partial refund failed.")).toBeInTheDocument();
    });
  });

  it("shows a fallback error when the service rejects without a message property", async () => {
    // Throw an object with no `message` key — component falls back to its own message
    mockPartialRefundAdminInvoice.mockRejectedValueOnce({});

    render(<PartialRefundInvoiceDialog invoice={makeInvoice()} onClose={noop} onSuccess={noop} />);

    const input = screen.getByPlaceholderText("0.00");
    await userEvent.type(input, "100");
    fireEvent.click(screen.getByRole("button", { name: /Continue to Confirmation/i }));
    await waitFor(() => screen.getByText(/I understand this refund cannot be undone/i));
    fireEvent.click(
      screen.getByRole("checkbox", { name: /I understand this refund cannot be undone/i })
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: /Refund Credits|Issue Stripe Refund|Issue Refund|Record Refund/i,
      })
    );

    await waitFor(() => {
      expect(screen.getByText(/Failed to process the partial refund/i)).toBeInTheDocument();
    });
  });

  // ─── Payment type indicators ────────────────────────────────────────────────

  it("shows credit-payment indicator for a credit-paid invoice", () => {
    const invoice = makeInvoice({
      payment_method: "Account Balance",
      has_stripe_payment: false,
      credit_amount: 500,
    });
    render(<PartialRefundInvoiceDialog invoice={invoice} onClose={noop} onSuccess={noop} />);
    expect(screen.getByText(/Credit refund/i)).toBeInTheDocument();
  });

  it("shows Stripe-refund indicator for a card-paid invoice", () => {
    const invoice = makeInvoice({
      payment_method: "Credit Card",
      has_stripe_payment: true,
      credit_amount: 0,
    });
    render(<PartialRefundInvoiceDialog invoice={invoice} onClose={noop} onSuccess={noop} />);
    expect(screen.getByText(/Stripe refund/i)).toBeInTheDocument();
  });

  it("shows missing-PI warning for a credit-card invoice with no payment intent", () => {
    const invoice = makeInvoice({
      payment_method: "Credit Card",
      has_stripe_payment: false,
      payment_intent_id: undefined,
    });
    render(<PartialRefundInvoiceDialog invoice={invoice} onClose={noop} onSuccess={noop} />);
    expect(screen.getByText(/Stripe Payment Intent ID missing/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("pi_3…")).toBeInTheDocument();
  });
});
