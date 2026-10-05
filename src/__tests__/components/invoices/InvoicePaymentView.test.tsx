import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import InvoicePaymentView from "@/components/invoices/payment/InvoicePaymentView";
import type { InvoiceDetail } from "@/components/invoices/invoiceData";
import type { PaymentProfile } from "@/types/client/payment-profile";

// ─── Module mocks ─────────────────────────────────────────────────────────────

jest.mock("@/services/public/invoice.service", () => ({
  getPublicInvoice: jest.fn(),
}));

jest.mock("@/services/client/invoices.service", () => ({
  invoicesService: { getInvoiceDetail: jest.fn() },
}));

jest.mock("@/services/client/payment-profile.service", () => ({
  paymentProfileService: {
    fetchPaymentProfiles: jest.fn(),
    createPaymentProfile: jest.fn(),
  },
}));

jest.mock("@/services/client/invoice-card-payment.service", () => ({
  invoiceCardPaymentService: {
    createAuthenticatedPaymentIntent: jest.fn(),
    createPublicPaymentIntent: jest.fn(),
    confirmAuthenticatedPayment: jest.fn(),
    confirmPublicPayment: jest.fn(),
  },
}));

jest.mock("@/lib/api-client", () => ({
  getToken: jest.fn(),
}));

jest.mock("@/lib/stripe", () => ({
  getStripe: jest.fn().mockReturnValue(null),
}));

/** Card fields expose a button so tests can mark them complete. */
function mockStripeField(test_id: string) {
  return function MockStripeField({ onChange }: { onChange?: (change_event: Record<string, unknown>) => void }) {
    return (
      <div data-testid={test_id}>
        <button type="button" onClick={() => onChange?.({ complete: true, brand: "visa" })}>
          complete {test_id}
        </button>
      </div>
    );
  };
}

jest.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardNumberElement: mockStripeField("card-number-element"),
  CardExpiryElement: mockStripeField("card-expiry-element"),
  CardCvcElement: mockStripeField("card-cvc-element"),
  useStripe: jest.fn(),
  useElements: jest.fn(),
}));

import { getPublicInvoice } from "@/services/public/invoice.service";
import { invoicesService } from "@/services/client/invoices.service";
import { paymentProfileService } from "@/services/client/payment-profile.service";
import { invoiceCardPaymentService } from "@/services/client/invoice-card-payment.service";
import { getToken } from "@/lib/api-client";
import { useStripe, useElements } from "@stripe/react-stripe-js";

const mockGetPublicInvoice = getPublicInvoice as jest.MockedFunction<typeof getPublicInvoice>;
const mockGetInvoiceDetail = invoicesService.getInvoiceDetail as jest.MockedFunction<typeof invoicesService.getInvoiceDetail>;
const mockFetchPaymentProfiles = paymentProfileService.fetchPaymentProfiles as jest.MockedFunction<
  typeof paymentProfileService.fetchPaymentProfiles
>;
const mockCardPaymentService = invoiceCardPaymentService as jest.Mocked<typeof invoiceCardPaymentService>;
const mockGetToken = getToken as jest.MockedFunction<typeof getToken>;
const mockUseStripe = useStripe as jest.MockedFunction<typeof useStripe>;
const mockUseElements = useElements as jest.MockedFunction<typeof useElements>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeInvoice(overrides: Partial<InvoiceDetail> = {}): InvoiceDetail {
  return {
    invoice_number: "BSM-1234",
    unique_id: "B72E1872",
    date_issued: "Oct 1, 2026",
    date_paid: null,
    date_due: "Oct 31, 2026",
    payment_method: "Credit Card",
    status: "unpaid",
    subtotal: "$500.00",
    total: "$500.00",
    credit: "$0.00",
    billed_to: null,
    line_items: [{ item_name: "Link Building Package", price: "$500.00", quantity: 1, item_total: "$500.00" }],
    ...overrides,
  };
}

function makeProfile(overrides: Partial<PaymentProfile> = {}): PaymentProfile {
  return {
    id: "profile-1",
    stripe_payment_method_id: "pm_saved_1",
    card_brand: "visa",
    last_four: "4242",
    expiry_month: "12",
    expiry_year: String(new Date().getFullYear() + 2),
    cardholder_name: "Jane Client",
    billing_address: null,
    is_default: true,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

let mock_confirm_card_payment: jest.Mock;

function setupStripe(status = "requires_capture") {
  mock_confirm_card_payment = jest.fn().mockResolvedValue({
    paymentIntent: { id: "pi_123", status, payment_method: "pm_new" },
  });
  mockUseStripe.mockReturnValue({ confirmCardPayment: mock_confirm_card_payment } as never);
  mockUseElements.mockReturnValue({ getElement: jest.fn().mockReturnValue({}) } as never);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("InvoicePaymentView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupStripe();
    mockGetToken.mockReturnValue("access-token");
    mockCardPaymentService.createAuthenticatedPaymentIntent.mockResolvedValue({
      client_secret: "pi_123_secret",
      payment_intent_id: "pi_123",
    });
    mockCardPaymentService.createPublicPaymentIntent.mockResolvedValue({
      client_secret: "pi_123_secret",
      payment_intent_id: "pi_123",
    });
    mockCardPaymentService.confirmAuthenticatedPayment.mockResolvedValue();
    mockCardPaymentService.confirmPublicPayment.mockResolvedValue();
  });

  describe("authenticated client", () => {
    it("preselects the default saved card and pays with it", async () => {
      mockGetInvoiceDetail.mockResolvedValue(makeInvoice());
      mockFetchPaymentProfiles.mockResolvedValue([
        makeProfile({ id: "profile-old", stripe_payment_method_id: "pm_old", last_four: "1111", is_default: false }),
        makeProfile(),
      ]);

      render(<InvoicePaymentView invoice_id="B72E1872" token="" />);

      const default_card = await screen.findByRole("radio", { name: /Visa ending in 4242/i });
      expect(default_card).toBeChecked();
      expect(screen.queryByTestId("card-number-element")).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /Pay \$500\.00/i }));

      await screen.findByText("Payment successful");
      expect(mockCardPaymentService.createAuthenticatedPaymentIntent).toHaveBeenCalledWith("B72E1872", {
        payment_profile_id: "profile-1",
      });
      expect(mock_confirm_card_payment).toHaveBeenCalledWith("pi_123_secret", { payment_method: "pm_saved_1" });
      expect(mockCardPaymentService.confirmAuthenticatedPayment).toHaveBeenCalledWith("B72E1872", "pi_123");
    });

    it("skips expired cards and falls back to a new card", async () => {
      mockGetInvoiceDetail.mockResolvedValue(makeInvoice());
      mockFetchPaymentProfiles.mockResolvedValue([makeProfile({ expiry_month: "01", expiry_year: "2020" })]);

      render(<InvoicePaymentView invoice_id="B72E1872" token="" />);

      expect(await screen.findByRole("radio", { name: /Visa ending in 4242/i })).toBeDisabled();
      expect(screen.getByRole("radio", { name: /Use a new card/i })).toBeChecked();
      expect(screen.getByTestId("card-number-element")).toBeInTheDocument();
    });

    it("shows the card form directly when there are no saved cards", async () => {
      mockGetInvoiceDetail.mockResolvedValue(makeInvoice());
      mockFetchPaymentProfiles.mockResolvedValue([]);

      render(<InvoicePaymentView invoice_id="B72E1872" token="" />);

      expect(await screen.findByTestId("card-number-element")).toBeInTheDocument();
      expect(screen.getByText(/Save this card for future payments/i)).toBeInTheDocument();
    });

    it("asks the user to sign in when there is no session", async () => {
      mockGetToken.mockReturnValue(null);

      render(<InvoicePaymentView invoice_id="B72E1872" token="" />);

      expect(await screen.findByText("Sign in to pay this invoice")).toBeInTheDocument();
      expect(mockGetInvoiceDetail).not.toHaveBeenCalled();
    });

    it("shows a card error returned by Stripe and keeps the invoice unpaid", async () => {
      mockGetInvoiceDetail.mockResolvedValue(makeInvoice());
      mockFetchPaymentProfiles.mockResolvedValue([makeProfile()]);
      mock_confirm_card_payment.mockResolvedValue({ error: { message: "Your card was declined." } });

      render(<InvoicePaymentView invoice_id="B72E1872" token="" />);

      fireEvent.click(await screen.findByRole("button", { name: /Pay \$500\.00/i }));

      expect(await screen.findByRole("alert")).toHaveTextContent("Your card was declined.");
      expect(mockCardPaymentService.confirmAuthenticatedPayment).not.toHaveBeenCalled();
    });

    it("offers a retry when the card is authorized but the payment cannot be recorded", async () => {
      mockGetInvoiceDetail.mockResolvedValue(makeInvoice());
      mockFetchPaymentProfiles.mockResolvedValue([makeProfile()]);
      mockCardPaymentService.confirmAuthenticatedPayment
        .mockRejectedValueOnce({ status_code: 500 })
        .mockResolvedValueOnce();

      render(<InvoicePaymentView invoice_id="B72E1872" token="" />);

      fireEvent.click(await screen.findByRole("button", { name: /Pay \$500\.00/i }));
      fireEvent.click(await screen.findByRole("button", { name: /Try again/i }));

      await screen.findByText("Payment successful");
      expect(mockCardPaymentService.confirmAuthenticatedPayment).toHaveBeenCalledTimes(2);
    });
  });

  describe("public share link", () => {
    it("never loads saved cards and pays with a new card", async () => {
      mockGetPublicInvoice.mockResolvedValue(makeInvoice());

      render(<InvoicePaymentView invoice_id="B72E1872" token="share-token" />);

      expect(await screen.findByTestId("card-number-element")).toBeInTheDocument();
      expect(mockFetchPaymentProfiles).not.toHaveBeenCalled();
      expect(screen.queryByText(/Save this card/i)).not.toBeInTheDocument();
    });

    it("validates the card fields before creating a payment", async () => {
      mockGetPublicInvoice.mockResolvedValue(makeInvoice());

      render(<InvoicePaymentView invoice_id="B72E1872" token="share-token" />);

      fireEvent.click(await screen.findByRole("button", { name: /Pay \$500\.00/i }));

      expect(await screen.findByText("Enter the name on the card.")).toBeInTheDocument();
      expect(screen.getByText("Enter your card number.")).toBeInTheDocument();
      expect(mockCardPaymentService.createPublicPaymentIntent).not.toHaveBeenCalled();
    });

    it("shows access denied for an invalid token", async () => {
      mockGetPublicInvoice.mockRejectedValue({ status_code: 403 });

      render(<InvoicePaymentView invoice_id="B72E1872" token="bad" />);

      expect(await screen.findByText("Access denied")).toBeInTheDocument();
    });
  });

  describe("non-payable invoices", () => {
    it.each([
      [{ status: "paid" as const }, "Invoice already paid"],
      [{ status: "void" as const }, "Payment not available"],
      [{ total: "120 credits" }, "Credits invoice"],
    ])("renders the right state for %o", async (invoice_overrides, expected_title) => {
      mockGetPublicInvoice.mockResolvedValue(makeInvoice(invoice_overrides));

      render(<InvoicePaymentView invoice_id="B72E1872" token="share-token" />);

      await waitFor(() => expect(screen.getByText(expected_title)).toBeInTheDocument());
    });
  });

  describe("public payment end to end", () => {
    function fillNewCard() {
      fireEvent.change(screen.getByLabelText("Name on card"), { target: { value: "Jane Client" } });
      fireEvent.click(screen.getByText("complete card-number-element"));
      fireEvent.click(screen.getByText("complete card-expiry-element"));
      fireEvent.click(screen.getByText("complete card-cvc-element"));
    }

    it("records the payment with the share token and links back to the shared invoice", async () => {
      mockGetPublicInvoice.mockResolvedValue(makeInvoice());

      render(<InvoicePaymentView invoice_id="B72E1872" token="share-token" />);

      await screen.findByTestId("card-number-element");
      fillNewCard();
      fireEvent.click(screen.getByRole("button", { name: /Pay \$500\.00/i }));

      expect(await screen.findByText("Payment successful")).toBeInTheDocument();
      expect(mockCardPaymentService.createPublicPaymentIntent).toHaveBeenCalledWith("B72E1872", "share-token");
      expect(mockCardPaymentService.confirmPublicPayment).toHaveBeenCalledWith("B72E1872", "share-token", "pi_123");
      expect(mockCardPaymentService.confirmAuthenticatedPayment).not.toHaveBeenCalled();
      expect(screen.getByRole("link", { name: "View invoice" })).toHaveAttribute(
        "href",
        "/invoices/B72E1872/view?token=share-token"
      );
      expect(screen.queryByRole("link", { name: "Back to invoices" })).not.toBeInTheDocument();
    });
  });

  describe("recovery after errors", () => {
    it("shows success when recording fails but the invoice was actually paid", async () => {
      mockGetInvoiceDetail
        .mockResolvedValueOnce(makeInvoice())
        .mockResolvedValueOnce(makeInvoice({ status: "paid" }));
      mockFetchPaymentProfiles.mockResolvedValue([makeProfile()]);
      mockCardPaymentService.confirmAuthenticatedPayment.mockRejectedValue({ status_code: 504 });

      render(<InvoicePaymentView invoice_id="B72E1872" token="" />);

      fireEvent.click(await screen.findByRole("button", { name: /Pay \$500\.00/i }));

      expect(await screen.findByText("Payment successful")).toBeInTheDocument();
    });

    it("stays on the retry screen while the payment still cannot be recorded", async () => {
      mockGetInvoiceDetail.mockResolvedValue(makeInvoice());
      mockFetchPaymentProfiles.mockResolvedValue([makeProfile()]);
      mockCardPaymentService.confirmAuthenticatedPayment.mockRejectedValue({ status_code: 500 });

      render(<InvoicePaymentView invoice_id="B72E1872" token="" />);

      fireEvent.click(await screen.findByRole("button", { name: /Pay \$500\.00/i }));
      expect(await screen.findByText("We couldn't finalize your payment")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /Try again/i }));

      await waitFor(() => expect(mockCardPaymentService.confirmAuthenticatedPayment).toHaveBeenCalledTimes(2));
      expect(mockCardPaymentService.confirmAuthenticatedPayment).toHaveBeenLastCalledWith("B72E1872", "pi_123");
      expect(await screen.findByText("We couldn't finalize your payment")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "support@basesearchmarketing.com" })).toBeInTheDocument();
    });

    it("reloads the invoice after a load error", async () => {
      mockGetInvoiceDetail.mockRejectedValueOnce({ status_code: 500 }).mockResolvedValueOnce(makeInvoice());
      mockFetchPaymentProfiles.mockResolvedValue([]);

      render(<InvoicePaymentView invoice_id="B72E1872" token="" />);

      fireEvent.click(await screen.findByRole("button", { name: /Try again/i }));

      expect(await screen.findByRole("button", { name: /Pay \$500\.00/i })).toBeInTheDocument();
      expect(mockGetInvoiceDetail).toHaveBeenCalledTimes(2);
    });

    it("falls back to a new card when saved cards cannot be loaded", async () => {
      mockGetInvoiceDetail.mockResolvedValue(makeInvoice());
      mockFetchPaymentProfiles.mockRejectedValue({ status_code: 500 });

      render(<InvoicePaymentView invoice_id="B72E1872" token="" />);

      expect(await screen.findByTestId("card-number-element")).toBeInTheDocument();
    });
  });

  describe("load states", () => {
    it("shows not found with a link back to the invoices list", async () => {
      mockGetInvoiceDetail.mockRejectedValue({ status_code: 404 });

      render(<InvoicePaymentView invoice_id="NOPE" token="" />);

      expect(await screen.findByText("Invoice not found")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Back to invoices" })).toHaveAttribute("href", "/invoices");
    });

    it("asks to sign in again when the session is rejected", async () => {
      mockGetInvoiceDetail.mockRejectedValue({ status_code: 401 });

      render(<InvoicePaymentView invoice_id="B72E1872" token="" />);

      expect(await screen.findByText("Sign in to pay this invoice")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
        "href",
        `/signin?callbackUrl=${encodeURIComponent("/invoices/B72E1872/pay")}`
      );
    });

    it("rejects invoices below the minimum card charge", async () => {
      mockGetPublicInvoice.mockResolvedValue(makeInvoice({ total: "$0.30" }));

      render(<InvoicePaymentView invoice_id="B72E1872" token="share-token" />);

      expect(await screen.findByText("Payment not available")).toBeInTheDocument();
      expect(mockCardPaymentService.createPublicPaymentIntent).not.toHaveBeenCalled();
    });

    it("allows paying overdue invoices and shows the summary", async () => {
      mockGetPublicInvoice.mockResolvedValue(
        makeInvoice({
          status: "overdue",
          subtotal: "$600.00",
          discount: "$50.00",
          total: "$500.00",
          coupon_discounts: [
            { code: "SAVE50", name: "Save 50", discount_type: "fixed_amount", discount_value: 50, discount_amount: "$50.00" },
          ],
        })
      );

      render(<InvoicePaymentView invoice_id="B72E1872" token="share-token" />);

      expect(await screen.findByRole("button", { name: /Pay \$500\.00/i })).toBeInTheDocument();
      expect(screen.getByText("Overdue")).toBeInTheDocument();
      expect(screen.getAllByText("Link Building Package").length).toBeGreaterThan(0);
      expect(screen.getAllByText("SAVE50").length).toBeGreaterThan(0);
      expect(screen.getByText(/Invoice #BSM-1234 · Due Oct 31, 2026/)).toBeInTheDocument();
    });
  });
});
