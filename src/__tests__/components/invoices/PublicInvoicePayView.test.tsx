import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PublicInvoicePayView from "@/components/invoices/PublicInvoicePayView";
import type { InvoiceDetail } from "@/components/invoices/invoiceData";

// ─── Module mocks ─────────────────────────────────────────────────────────────

jest.mock("@/services/public/invoice.service", () => ({
  getPublicInvoice: jest.fn(),
}));

jest.mock("@/services/public/invoice-payment.service", () => ({
  createInvoicePaymentIntent: jest.fn(),
  confirmInvoicePayment:      jest.fn(),
}));

jest.mock("@/services/client/invoices.service", () => ({
  invoicesService: {
    getInvoiceDetail:           jest.fn(),
    payClientInvoice:           jest.fn(),
    createInvoicePaymentIntent: jest.fn(),
  },
}));

jest.mock("@/services/client/payment-profile.service", () => ({
  paymentProfileService: {
    fetchPaymentProfiles: jest.fn(),
    createPaymentProfile: jest.fn(),
  },
}));

jest.mock("@/services/client/autopay.service", () => ({
  autopayService: {
    getAutopaySettings:    jest.fn(),
    updateAutopaySettings: jest.fn(),
    disableAutopay:        jest.fn(),
  },
}));

jest.mock("@/lib/stripe", () => ({
  getStripe: jest.fn().mockReturnValue(null),
}));

jest.mock("@stripe/react-stripe-js", () => ({
  Elements:       ({ children }: { children: React.ReactNode }) => <div data-testid="stripe-elements">{children}</div>,
  PaymentElement: () => <div data-testid="payment-element" />,
  useStripe:      jest.fn(),
  useElements:    jest.fn(),
}));

// ─── Imports after mocks ──────────────────────────────────────────────────────

import { getPublicInvoice } from "@/services/public/invoice.service";
import {
  createInvoicePaymentIntent,
  confirmInvoicePayment,
} from "@/services/public/invoice-payment.service";
import { invoicesService } from "@/services/client/invoices.service";
import { paymentProfileService } from "@/services/client/payment-profile.service";
import { autopayService } from "@/services/client/autopay.service";
import { getStripe } from "@/lib/stripe";
import { useStripe, useElements } from "@stripe/react-stripe-js";
import type { PaymentProfile } from "@/types/client/payment-profile";
import type { AutopaySettings } from "@/types/client/autopay";

const mockGetPublicInvoice           = getPublicInvoice           as jest.MockedFunction<typeof getPublicInvoice>;
const mockCreatePaymentIntent        = createInvoicePaymentIntent as jest.MockedFunction<typeof createInvoicePaymentIntent>;
const mockConfirmInvoicePayment      = confirmInvoicePayment      as jest.MockedFunction<typeof confirmInvoicePayment>;
const mockGetInvoiceDetail           = invoicesService.getInvoiceDetail as jest.MockedFunction<typeof invoicesService.getInvoiceDetail>;
const mockUseStripe                  = useStripe                  as jest.MockedFunction<typeof useStripe>;
const mockUseElements                = useElements                as jest.MockedFunction<typeof useElements>;
const mockPayClientInvoice           = invoicesService.payClientInvoice as jest.MockedFunction<typeof invoicesService.payClientInvoice>;
const mockCreateClientIntent         = invoicesService.createInvoicePaymentIntent as jest.MockedFunction<typeof invoicesService.createInvoicePaymentIntent>;
const mockFetchPaymentProfiles       = paymentProfileService.fetchPaymentProfiles as jest.MockedFunction<typeof paymentProfileService.fetchPaymentProfiles>;
const mockCreatePaymentProfile       = paymentProfileService.createPaymentProfile as jest.MockedFunction<typeof paymentProfileService.createPaymentProfile>;
const mockGetAutopaySettings         = autopayService.getAutopaySettings as jest.MockedFunction<typeof autopayService.getAutopaySettings>;
const mockGetStripe                  = getStripe as jest.MockedFunction<typeof getStripe>;

// ─── sessionStorage mock ──────────────────────────────────────────────────────

const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem:    (key: string) => store[key] ?? null,
    setItem:    (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear:      () => { store = {}; },
  };
})();

Object.defineProperty(window, "sessionStorage", { value: sessionStorageMock });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeInvoiceDetail(overrides: Partial<InvoiceDetail> = {}): InvoiceDetail {
  return {
    invoice_number: "BSM-1234",
    unique_id:      "ABC123",
    date_issued:    "Jun 1, 2026",
    date_paid:      null,
    date_due:       "Jun 30, 2026",
    payment_method: "Credit Card",
    status:         "unpaid",
    subtotal:       "$500.00",
    total:          "$500.00",
    credit:         "$0.00",
    billed_to:      null,
    line_items:     [
      {
        item_name:    "Link Building Package",
        price:        "$500.00",
        quantity:     1,
        item_total:   "$500.00",
        product_type: "link_building",
      },
    ],
    ...overrides,
  };
}

function setupStripeHooks(intent_status = "requires_capture") {
  const mockStripe = {
    confirmPayment: jest.fn().mockResolvedValue({
      error:         null,
      paymentIntent: { id: "pi_test_success", status: intent_status, payment_method: "pm_new_card" },
    }),
  };
  const mockElementsObj = { submit: jest.fn().mockResolvedValue({}), update: jest.fn() };

  mockUseStripe.mockReturnValue(mockStripe as never);
  mockUseElements.mockReturnValue(mockElementsObj as never);

  return { mockStripe, mockElementsObj };
}

function makePaymentProfile(overrides: Partial<PaymentProfile> = {}): PaymentProfile {
  return {
    id:                       "profile-visa",
    stripe_payment_method_id: "pm_saved_visa",
    card_brand:               "visa",
    last_four:                "9150",
    expiry_month:             "07",
    expiry_year:              String(new Date().getFullYear() + 2),
    cardholder_name:          null,
    billing_address:          null,
    is_default:               true,
    created_at:               "2026-01-01T00:00:00Z",
    updated_at:               "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeAutopaySettings(overrides: Partial<AutopaySettings> = {}): AutopaySettings {
  return {
    is_enabled:         false,
    payment_profile_id: null,
    payment_profile:    null,
    max_amount:         null,
    enabled_at:         null,
    disabled_at:        null,
    disabled_by_type:   null,
    disabled_reason:    null,
    consent_text:       "I authorize automatic charges.",
    max_attempts:       3,
    recent_charges:     [],
    ...overrides,
  };
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe("PublicInvoicePayView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorageMock.clear();
  });

  // ─── Loading state ──────────────────────────────────────────────────────

  describe("loading state", () => {
    it("renders loading spinner while fetching invoice", () => {
      mockGetPublicInvoice.mockImplementation(() => new Promise(() => {}));

      render(<PublicInvoicePayView invoice_id="ABC123" token="valid-token" />);

      expect(screen.getByText(/loading invoice/i)).toBeInTheDocument();
    });
  });

  // ─── Not found ──────────────────────────────────────────────────────────

  describe("not found state", () => {
    it("shows Invoice not found when API returns 404", async () => {
      mockGetPublicInvoice.mockRejectedValue({ status_code: 404, message: "Invoice not found." });

      render(<PublicInvoicePayView invoice_id="NOPE" token="tok" />);

      await waitFor(() => {
        expect(screen.getByText(/invoice not found/i)).toBeInTheDocument();
      });
    });

    it("shows expired link description on 404", async () => {
      mockGetPublicInvoice.mockRejectedValue({ status_code: 404 });

      render(<PublicInvoicePayView invoice_id="NOPE" token="tok" />);

      await waitFor(() => {
        expect(screen.getByText(/does not exist or the link has expired/i)).toBeInTheDocument();
      });
    });
  });

  // ─── Unauthorized ───────────────────────────────────────────────────────

  describe("unauthorized state", () => {
    it("shows Access denied when API returns 403", async () => {
      mockGetPublicInvoice.mockRejectedValue({ status_code: 403, message: "Access denied." });

      render(<PublicInvoicePayView invoice_id="ABC123" token="bad-token" />);

      await waitFor(() => {
        expect(screen.getByText(/access denied/i)).toBeInTheDocument();
      });
    });

    it("shows Access denied when API returns 401", async () => {
      mockGetPublicInvoice.mockRejectedValue({ status_code: 401 });

      render(<PublicInvoicePayView invoice_id="ABC123" token="expired-token" />);

      await waitFor(() => {
        expect(screen.getByText(/access denied/i)).toBeInTheDocument();
      });
    });

    it("shows invalid or disabled link description on 403", async () => {
      mockGetPublicInvoice.mockRejectedValue({ status_code: 403 });

      render(<PublicInvoicePayView invoice_id="ABC123" token="bad" />);

      await waitFor(() => {
        expect(screen.getByText(/invalid or has been disabled/i)).toBeInTheDocument();
      });
    });
  });

  // ─── Already paid ───────────────────────────────────────────────────────

  describe("already paid state", () => {
    it("shows already paid message for paid invoices", async () => {
      mockGetPublicInvoice.mockResolvedValue(makeInvoiceDetail({ status: "paid", date_paid: "Jun 1, 2026" }));

      render(<PublicInvoicePayView invoice_id="ABC123" token="tok" />);

      await waitFor(() => {
        expect(screen.getByText(/invoice already paid/i)).toBeInTheDocument();
      });
    });

    it("shows confirmation email notice on already-paid state", async () => {
      mockGetPublicInvoice.mockResolvedValue(makeInvoiceDetail({ status: "paid" }));

      render(<PublicInvoicePayView invoice_id="ABC123" token="tok" />);

      await waitFor(() => {
        expect(screen.getByText(/confirmation email/i)).toBeInTheDocument();
      });
    });
  });

  // ─── Credits invoice ────────────────────────────────────────────────────

  describe("credits invoice state", () => {
    it("shows credits invoice message when total is in credits", async () => {
      mockGetPublicInvoice.mockResolvedValue(
        makeInvoiceDetail({ total: "500 credits", status: "unpaid" })
      );

      render(<PublicInvoicePayView invoice_id="ABC123" token="tok" />);

      await waitFor(() => {
        expect(screen.getByText(/credits invoice/i)).toBeInTheDocument();
      });
    });

    it("explains credits cannot be paid by card", async () => {
      mockGetPublicInvoice.mockResolvedValue(
        makeInvoiceDetail({ total: "200 credits", status: "unpaid" })
      );

      render(<PublicInvoicePayView invoice_id="ABC123" token="tok" />);

      await waitFor(() => {
        expect(screen.getByText(/cannot be paid with a credit card/i)).toBeInTheDocument();
      });
    });
  });

  // ─── Invalid status ─────────────────────────────────────────────────────

  describe("invalid status state", () => {
    it("shows payment not available for void invoices", async () => {
      mockGetPublicInvoice.mockResolvedValue(
        makeInvoiceDetail({ status: "void" })
      );

      render(<PublicInvoicePayView invoice_id="ABC123" token="tok" />);

      await waitFor(() => {
        expect(screen.getByText(/payment not available/i)).toBeInTheDocument();
      });
    });

    it("shows payment not available for refund invoices", async () => {
      mockGetPublicInvoice.mockResolvedValue(
        makeInvoiceDetail({ status: "refund" })
      );

      render(<PublicInvoicePayView invoice_id="ABC123" token="tok" />);

      await waitFor(() => {
        expect(screen.getByText(/payment not available/i)).toBeInTheDocument();
      });
    });
  });

  // ─── Generic error ──────────────────────────────────────────────────────

  describe("generic error state", () => {
    it("shows Something went wrong on unexpected error", async () => {
      mockGetPublicInvoice.mockRejectedValue({ status_code: 500 });

      render(<PublicInvoicePayView invoice_id="ABC123" token="tok" />);

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });
    });

    it("shows an inline error when payment intent creation fails on submit", async () => {
      mockGetPublicInvoice.mockResolvedValue(makeInvoiceDetail({ status: "unpaid" }));
      mockCreatePaymentIntent.mockRejectedValue({ message: "Failed to initialize payment.", status_code: 502 });
      setupStripeHooks();

      render(<PublicInvoicePayView invoice_id="ABC123" token="tok" />);

      await screen.findByText(/complete your payment/i);
      fireEvent.submit(document.querySelector("form")!);

      expect(await screen.findByRole("alert")).toHaveTextContent(/failed to initialize payment/i);
    });
  });

  // ─── Ready state (payment form) ─────────────────────────────────────────

  describe("ready state (payment form)", () => {
    beforeEach(() => {
      mockGetPublicInvoice.mockResolvedValue(makeInvoiceDetail({ status: "unpaid", unique_id: "ABC123" }));
      mockCreatePaymentIntent.mockResolvedValue({
        client_secret:     "pi_secret_abc",
        payment_intent_id: "pi_abc",
        amount_cents:      50000,
      });
      setupStripeHooks();
    });

    it("renders the Stripe Elements wrapper when invoice is ready", async () => {
      render(<PublicInvoicePayView invoice_id="ABC123" token="valid-tok" />);

      await waitFor(() => {
        expect(screen.getByTestId("stripe-elements")).toBeInTheDocument();
      });
    });

    it("renders the complete payment heading", async () => {
      render(<PublicInvoicePayView invoice_id="ABC123" token="valid-tok" />);

      await waitFor(() => {
        expect(screen.getByText(/complete your payment/i)).toBeInTheDocument();
      });
    });

    it("renders invoice number in the heading area", async () => {
      render(<PublicInvoicePayView invoice_id="ABC123" token="valid-tok" />);

      await waitFor(() => {
        expect(screen.getAllByText(/BSM-1234/).length).toBeGreaterThan(0);
      });
    });

    it("renders total amount in the heading", async () => {
      render(<PublicInvoicePayView invoice_id="ABC123" token="valid-tok" />);

      await waitFor(() => {
        expect(screen.getAllByText(/\$500\.00/).length).toBeGreaterThan(0);
      });
    });

    it("shows the Complete Purchase button with amount", async () => {
      render(<PublicInvoicePayView invoice_id="ABC123" token="valid-tok" />);

      await waitFor(() => {
        expect(screen.getByText(/complete purchase/i)).toBeInTheDocument();
      });
    });

    it("shows the Stripe security badge", async () => {
      render(<PublicInvoicePayView invoice_id="ABC123" token="valid-tok" />);

      await waitFor(() => {
        expect(screen.getByText(/encrypted and secured by/i)).toBeInTheDocument();
      });
    });

    it("shows the payment element from Stripe", async () => {
      render(<PublicInvoicePayView invoice_id="ABC123" token="valid-tok" />);

      await waitFor(() => {
        expect(screen.getByTestId("payment-element")).toBeInTheDocument();
      });
    });

    it("does not create a payment intent until the client submits", async () => {
      render(<PublicInvoicePayView invoice_id="ABC123" token="valid-tok" />);

      await waitFor(() => {
        expect(screen.getByTestId("stripe-elements")).toBeInTheDocument();
      });

      expect(mockCreatePaymentIntent).not.toHaveBeenCalled();
    });

    it("never loads saved cards or autopay on a public share link", async () => {
      render(<PublicInvoicePayView invoice_id="ABC123" token="valid-tok" />);

      await screen.findByText(/complete your payment/i);

      expect(mockFetchPaymentProfiles).not.toHaveBeenCalled();
      expect(mockGetAutopaySettings).not.toHaveBeenCalled();
      expect(screen.queryByText(/save this card/i)).not.toBeInTheDocument();
    });
  });

  // ─── Line items in sidebar ──────────────────────────────────────────────

  describe("invoice summary sidebar", () => {
    beforeEach(() => {
      mockGetPublicInvoice.mockResolvedValue(
        makeInvoiceDetail({
          status:     "unpaid",
          unique_id:  "ABC123",
          line_items: [
            { item_name: "DR 30+ Link Building", price: "$300.00", quantity: 2, item_total: "$600.00", product_type: "link_building" },
            { item_name: "New Content Article",  price: "$200.00", quantity: 1, item_total: "$200.00", product_type: "new_content" },
          ],
          total: "$800.00",
        })
      );
      mockCreatePaymentIntent.mockResolvedValue({
        client_secret:     "pi_secret_abc",
        payment_intent_id: "pi_abc",
        amount_cents:      50000,
      });
      setupStripeHooks();
    });

    it("renders line item names in the summary panel", async () => {
      render(<PublicInvoicePayView invoice_id="ABC123" token="tok" />);

      await waitFor(() => {
        expect(screen.getByText("DR 30+ Link Building")).toBeInTheDocument();
      });
    });

    it("renders line item quantities in the summary", async () => {
      render(<PublicInvoicePayView invoice_id="ABC123" token="tok" />);

      await waitFor(() => {
        expect(screen.getByText(/qty 2/i)).toBeInTheDocument();
      });
    });
  });

  // ─── Discount display ───────────────────────────────────────────────────

  describe("discounts in summary", () => {
    it("shows discount amount when invoice has a discount", async () => {
      mockGetPublicInvoice.mockResolvedValue(
        makeInvoiceDetail({
          status:   "unpaid",
          unique_id: "ABC123",
          subtotal: "$600.00",
          discount: "$100.00",
          total:    "$500.00",
        })
      );
      mockCreatePaymentIntent.mockResolvedValue({
        client_secret:     "pi_secret_abc",
        payment_intent_id: "pi_abc",
        amount_cents:      50000,
      });
      setupStripeHooks();

      render(<PublicInvoicePayView invoice_id="ABC123" token="tok" />);

      await waitFor(() => {
        expect(screen.getByText(/discount/i)).toBeInTheDocument();
      });
    });

    it("shows applied coupon code chip", async () => {
      mockGetPublicInvoice.mockResolvedValue(
        makeInvoiceDetail({
          status:   "unpaid",
          unique_id: "ABC123",
          total:    "$450.00",
          coupon_discounts: [
            {
              code:            "SAVE10",
              name:            "Save 10%",
              discount_type:   "percentage",
              discount_value:  10,
              discount_amount: "$50.00",
            },
          ],
        })
      );
      mockCreatePaymentIntent.mockResolvedValue({
        client_secret:     "pi_secret_abc",
        payment_intent_id: "pi_abc",
        amount_cents:      50000,
      });
      setupStripeHooks();

      render(<PublicInvoicePayView invoice_id="ABC123" token="tok" />);

      await waitFor(() => {
        expect(screen.getByText("SAVE10")).toBeInTheDocument();
      });
    });
  });

  // ─── Success state ──────────────────────────────────────────────────────

  describe("success state after payment", () => {
    it("shows Payment successful after Stripe confirms and backend confirms", async () => {
      mockGetPublicInvoice.mockResolvedValue(makeInvoiceDetail({ status: "unpaid", unique_id: "ABC123" }));
      mockCreatePaymentIntent.mockResolvedValue({ client_secret: "pi_sec", payment_intent_id: "pi_id", amount_cents: 50000 });
      mockConfirmInvoicePayment.mockResolvedValue(undefined);

      const { mockStripe } = setupStripeHooks();

      render(<PublicInvoicePayView invoice_id="ABC123" token="valid-tok" />);

      await waitFor(() => {
        expect(screen.getByText(/complete your payment/i)).toBeInTheDocument();
      });

      fireEvent.submit(document.querySelector("form")!);

      await waitFor(() => {
        expect(screen.getByText(/payment successful/i)).toBeInTheDocument();
      });
      expect(mockCreatePaymentIntent).toHaveBeenCalledWith("ABC123", "valid-tok");
      expect(mockStripe.confirmPayment).toHaveBeenCalledWith(
        expect.objectContaining({ clientSecret: "pi_sec", redirect: "if_required" })
      );
      expect(mockConfirmInvoicePayment).toHaveBeenCalledWith("ABC123", "valid-tok", "pi_test_success");
    });

    it("shows the API error and stays on the form when the payment is rejected", async () => {
      mockGetPublicInvoice.mockResolvedValue(makeInvoiceDetail({ status: "unpaid", unique_id: "ABC123" }));
      mockCreatePaymentIntent.mockResolvedValue({ client_secret: "pi_sec", payment_intent_id: "pi_id", amount_cents: 50000 });
      mockConfirmInvoicePayment.mockRejectedValue({ message: "Payment verification failed.", status_code: 402 });
      setupStripeHooks();

      render(<PublicInvoicePayView invoice_id="ABC123" token="tok" />);

      await screen.findByText(/complete your payment/i);
      fireEvent.submit(document.querySelector("form")!);

      expect(await screen.findByRole("alert")).toHaveTextContent(/payment verification failed/i);
      expect(screen.queryByText(/payment successful/i)).not.toBeInTheDocument();
    });

    it("shows the pending state when the payment outcome cannot be confirmed (network error)", async () => {
      mockGetPublicInvoice.mockResolvedValue(makeInvoiceDetail({ status: "unpaid", unique_id: "ABC123" }));
      mockCreatePaymentIntent.mockResolvedValue({ client_secret: "pi_sec", payment_intent_id: "pi_id", amount_cents: 50000 });
      mockConfirmInvoicePayment.mockRejectedValue(new Error("Network error"));
      setupStripeHooks();

      render(<PublicInvoicePayView invoice_id="ABC123" token="valid-tok" />);

      await screen.findByText(/complete your payment/i);
      fireEvent.submit(document.querySelector("form")!);

      expect(await screen.findByText(/payment submitted/i)).toBeInTheDocument();
    });
  });

  // ─── Stripe payment error ───────────────────────────────────────────────

  describe("Stripe payment error in form", () => {
    it("shows error message when Stripe.confirmPayment returns an error", async () => {
      mockGetPublicInvoice.mockResolvedValue(makeInvoiceDetail({ status: "unpaid", unique_id: "ABC123" }));
      mockCreatePaymentIntent.mockResolvedValue({ client_secret: "pi_sec", payment_intent_id: "pi_id", amount_cents: 50000 });

      const mockStripe = {
        confirmPayment: jest.fn().mockResolvedValue({
          error:         { message: "Your card was declined." },
          paymentIntent: null,
        }),
      };
      mockUseStripe.mockReturnValue(mockStripe as never);
      mockUseElements.mockReturnValue({ submit: jest.fn().mockResolvedValue({}), update: jest.fn() } as never);

      render(<PublicInvoicePayView invoice_id="ABC123" token="valid-tok" />);

      await waitFor(() => {
        expect(screen.getByText(/complete your payment/i)).toBeInTheDocument();
      });

      const form = document.querySelector("form");
      if (form) {
        fireEvent.submit(form);

        await waitFor(() => {
          expect(screen.getByText(/your card was declined/i)).toBeInTheDocument();
        });
      }
    });
  });

  // ─── Mobile summary strip ───────────────────────────────────────────────

  describe("mobile summary strip", () => {
    it("renders Order summary toggle button on mobile", async () => {
      mockGetPublicInvoice.mockResolvedValue(makeInvoiceDetail({ status: "unpaid", unique_id: "ABC123" }));
      mockCreatePaymentIntent.mockResolvedValue({ client_secret: "pi_sec", payment_intent_id: "pi_id", amount_cents: 50000 });
      setupStripeHooks();

      render(<PublicInvoicePayView invoice_id="ABC123" token="tok" />);

      await waitFor(() => {
        expect(screen.getByText(/order summary/i)).toBeInTheDocument();
      });
    });

    it("expands mobile summary strip when toggle is clicked", async () => {
      mockGetPublicInvoice.mockResolvedValue(
        makeInvoiceDetail({
          status:     "unpaid",
          unique_id:  "ABC123",
          line_items: [
            { item_name: "Test Item", price: "$100.00", quantity: 1, item_total: "$100.00" },
          ],
          total: "$100.00",
        })
      );
      mockCreatePaymentIntent.mockResolvedValue({ client_secret: "pi_sec", payment_intent_id: "pi_id", amount_cents: 50000 });
      setupStripeHooks();

      render(<PublicInvoicePayView invoice_id="ABC123" token="tok" />);

      const toggle = await screen.findByText(/order summary/i);
      fireEvent.click(toggle.closest("button")!);

      await waitFor(() => {
        expect(screen.getAllByText("Test Item").length).toBeGreaterThan(0);
      });
    });
  });

  // ─── Authenticated flow (no token) ─────────────────────────────────────

  describe("authenticated flow (no token)", () => {
    it("calls getInvoiceDetail instead of getPublicInvoice when token is empty", async () => {
      mockGetInvoiceDetail.mockResolvedValue(makeInvoiceDetail({ status: "paid" }));

      render(<PublicInvoicePayView invoice_id="ABC123" token="" />);

      await waitFor(() => {
        expect(mockGetInvoiceDetail).toHaveBeenCalledWith("ABC123");
        expect(mockGetPublicInvoice).not.toHaveBeenCalled();
      });
    });

    it("pays with a new card, saves it, and shows Return to Invoices", async () => {
      mockGetInvoiceDetail.mockResolvedValue(makeInvoiceDetail({ status: "unpaid", unique_id: "ABC123" }));
      mockFetchPaymentProfiles.mockResolvedValue([]);
      mockGetAutopaySettings.mockResolvedValue(makeAutopaySettings());
      mockCreateClientIntent.mockResolvedValue({ client_secret: "pi_sec", payment_intent_id: "pi_id", amount_cents: 50000 });
      mockPayClientInvoice.mockResolvedValue(makeInvoiceDetail({ status: "paid" }));
      mockCreatePaymentProfile.mockResolvedValue(makePaymentProfile());
      setupStripeHooks();

      render(<PublicInvoicePayView invoice_id="ABC123" token="" />);

      await screen.findByText(/save this card for future payments/i);
      fireEvent.submit(document.querySelector("form")!);

      expect(await screen.findByText(/return to invoices/i)).toBeInTheDocument();
      expect(mockCreateClientIntent).toHaveBeenCalledWith("ABC123", { save_card: true });
      expect(mockPayClientInvoice).toHaveBeenCalledWith("ABC123", {
        payment_method:    "credit_card",
        payment_intent_id: "pi_test_success",
      });
      expect(mockCreatePaymentProfile).toHaveBeenCalledWith(
        expect.objectContaining({ stripe_payment_method_id: "pm_new_card", is_default: true })
      );
      expect(mockCreatePaymentIntent).not.toHaveBeenCalled();
    });

    it("preselects the default saved card and pays with it", async () => {
      mockGetInvoiceDetail.mockResolvedValue(makeInvoiceDetail({ status: "unpaid", unique_id: "ABC123" }));
      mockFetchPaymentProfiles.mockResolvedValue([
        makePaymentProfile({ id: "profile-mc", card_brand: "mastercard", last_four: "4444", is_default: false }),
        makePaymentProfile(),
      ]);
      mockGetAutopaySettings.mockResolvedValue(makeAutopaySettings());
      mockCreateClientIntent.mockResolvedValue({ client_secret: "pi_saved_sec", payment_intent_id: "pi_saved", amount_cents: 50000 });
      mockPayClientInvoice.mockResolvedValue(makeInvoiceDetail({ status: "paid" }));

      const confirmCardPayment = jest.fn().mockResolvedValue({
        error:         null,
        paymentIntent: { id: "pi_saved", status: "requires_capture" },
      });
      mockGetStripe.mockReturnValue(Promise.resolve({ confirmCardPayment }) as never);

      render(<PublicInvoicePayView invoice_id="ABC123" token="" />);

      const pay_button = await screen.findByRole("button", { name: /pay \$500\.00 with visa •••• 9150/i });
      expect(screen.queryByTestId("payment-element")).not.toBeInTheDocument();

      fireEvent.click(pay_button);

      expect(await screen.findByText(/payment successful/i)).toBeInTheDocument();
      expect(mockCreateClientIntent).toHaveBeenCalledWith("ABC123", { payment_profile_id: "profile-visa" });
      expect(confirmCardPayment).toHaveBeenCalledWith("pi_saved_sec");
      expect(mockPayClientInvoice).toHaveBeenCalledWith("ABC123", {
        payment_method:    "credit_card",
        payment_intent_id: "pi_saved",
      });
    });

    it("shows the decline message when the saved card is declined", async () => {
      mockGetInvoiceDetail.mockResolvedValue(makeInvoiceDetail({ status: "unpaid", unique_id: "ABC123" }));
      mockFetchPaymentProfiles.mockResolvedValue([makePaymentProfile()]);
      mockGetAutopaySettings.mockResolvedValue(makeAutopaySettings());
      mockCreateClientIntent.mockResolvedValue({ client_secret: "pi_saved_sec", payment_intent_id: "pi_saved", amount_cents: 50000 });
      mockGetStripe.mockReturnValue(Promise.resolve({
        confirmCardPayment: jest.fn().mockResolvedValue({ error: { message: "Your card was declined." } }),
      }) as never);

      render(<PublicInvoicePayView invoice_id="ABC123" token="" />);

      fireEvent.click(await screen.findByRole("button", { name: /pay \$500\.00 with visa/i }));

      expect(await screen.findByRole("alert")).toHaveTextContent(/your card was declined/i);
      expect(mockPayClientInvoice).not.toHaveBeenCalled();
    });

    it("switches to the new card form when 'Use a different card' is selected", async () => {
      mockGetInvoiceDetail.mockResolvedValue(makeInvoiceDetail({ status: "unpaid", unique_id: "ABC123" }));
      mockFetchPaymentProfiles.mockResolvedValue([makePaymentProfile()]);
      mockGetAutopaySettings.mockResolvedValue(makeAutopaySettings());
      setupStripeHooks();

      render(<PublicInvoicePayView invoice_id="ABC123" token="" />);

      fireEvent.click(await screen.findByLabelText(/use a different card/i));

      expect(await screen.findByTestId("payment-element")).toBeInTheDocument();
    });

    it("does not preselect an expired saved card", async () => {
      mockGetInvoiceDetail.mockResolvedValue(makeInvoiceDetail({ status: "unpaid", unique_id: "ABC123" }));
      mockFetchPaymentProfiles.mockResolvedValue([makePaymentProfile({ expiry_year: "2020" })]);
      mockGetAutopaySettings.mockResolvedValue(makeAutopaySettings());
      setupStripeHooks();

      render(<PublicInvoicePayView invoice_id="ABC123" token="" />);

      expect(await screen.findByText(/expired/i)).toBeInTheDocument();
      expect(screen.getByTestId("payment-element")).toBeInTheDocument();
    });

    it("shows the Autopay panel with the current autopay card", async () => {
      mockGetInvoiceDetail.mockResolvedValue(makeInvoiceDetail({ status: "unpaid", unique_id: "ABC123" }));
      mockFetchPaymentProfiles.mockResolvedValue([makePaymentProfile()]);
      mockGetAutopaySettings.mockResolvedValue(makeAutopaySettings({
        is_enabled:         true,
        payment_profile_id: "profile-visa",
        payment_profile:    { id: "profile-visa", card_brand: "visa", last_four: "9150", expiry_month: "07", expiry_year: "2030" },
        enabled_at:         "2026-09-01T00:00:00Z",
      }));

      render(<PublicInvoicePayView invoice_id="ABC123" token="" />);

      expect(await screen.findByText(/paid automatically on their due date/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /turn off/i })).toBeInTheDocument();
    });
  });

  // ─── BASE branding ──────────────────────────────────────────────────────

  describe("branding", () => {
    it("shows BASE Search Marketing branding in the payment form", async () => {
      mockGetPublicInvoice.mockResolvedValue(makeInvoiceDetail({ status: "unpaid", unique_id: "ABC123" }));
      mockCreatePaymentIntent.mockResolvedValue({ client_secret: "pi_sec", payment_intent_id: "pi_id", amount_cents: 50000 });
      setupStripeHooks();

      render(<PublicInvoicePayView invoice_id="ABC123" token="tok" />);

      await waitFor(() => {
        expect(screen.getByText("BASE")).toBeInTheDocument();
      });
    });
  });
});
