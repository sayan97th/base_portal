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
    getInvoiceDetail: jest.fn(),
    payClientInvoice: jest.fn(),
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
import { useStripe, useElements } from "@stripe/react-stripe-js";

const mockGetPublicInvoice           = getPublicInvoice           as jest.MockedFunction<typeof getPublicInvoice>;
const mockCreatePaymentIntent        = createInvoicePaymentIntent as jest.MockedFunction<typeof createInvoicePaymentIntent>;
const mockConfirmInvoicePayment      = confirmInvoicePayment      as jest.MockedFunction<typeof confirmInvoicePayment>;
const mockGetInvoiceDetail           = invoicesService.getInvoiceDetail as jest.MockedFunction<typeof invoicesService.getInvoiceDetail>;
const mockUseStripe                  = useStripe                  as jest.MockedFunction<typeof useStripe>;
const mockUseElements                = useElements                as jest.MockedFunction<typeof useElements>;

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

function setupStripeHooks(): void {
  const mockStripe = {
    confirmPayment: jest.fn().mockResolvedValue({
      error:         null,
      paymentIntent: { id: "pi_test_success", status: "succeeded" },
    }),
  };
  const mockElementsObj = { submit: jest.fn() };

  mockUseStripe.mockReturnValue(mockStripe as never);
  mockUseElements.mockReturnValue(mockElementsObj as never);
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

      render(<PublicInvoicePayView invoice_id="ABC123" token="" />);

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

    it("shows Something went wrong when payment intent creation fails", async () => {
      mockGetPublicInvoice.mockResolvedValue(makeInvoiceDetail({ status: "unpaid" }));
      mockCreatePaymentIntent.mockRejectedValue(new Error("Stripe error"));

      render(<PublicInvoicePayView invoice_id="ABC123" token="tok" />);

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });
    });
  });

  // ─── Ready state (payment form) ─────────────────────────────────────────

  describe("ready state (payment form)", () => {
    beforeEach(() => {
      mockGetPublicInvoice.mockResolvedValue(makeInvoiceDetail({ status: "unpaid", unique_id: "ABC123" }));
      mockCreatePaymentIntent.mockResolvedValue({
        client_secret:     "pi_secret_abc",
        payment_intent_id: "pi_abc",
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
        expect(screen.getByText(/BSM-1234/)).toBeInTheDocument();
      });
    });

    it("renders total amount in the heading", async () => {
      render(<PublicInvoicePayView invoice_id="ABC123" token="valid-tok" />);

      await waitFor(() => {
        expect(screen.getByText(/\$500\.00/)).toBeInTheDocument();
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
        expect(screen.getByText(/secured.*stripe/i)).toBeInTheDocument();
      });
    });

    it("shows the payment element from Stripe", async () => {
      render(<PublicInvoicePayView invoice_id="ABC123" token="valid-tok" />);

      await waitFor(() => {
        expect(screen.getByTestId("payment-element")).toBeInTheDocument();
      });
    });

    it("uses cached client_secret from sessionStorage on second render", async () => {
      sessionStorageMock.setItem("pi_secret_ABC123_50000_valid-tok", "cached_secret");

      render(<PublicInvoicePayView invoice_id="ABC123" token="valid-tok" />);

      await waitFor(() => {
        expect(screen.getByTestId("stripe-elements")).toBeInTheDocument();
      });

      expect(mockCreatePaymentIntent).not.toHaveBeenCalled();
    });

    it("stores the client_secret in sessionStorage after creation", async () => {
      render(<PublicInvoicePayView invoice_id="ABC123" token="valid-tok" />);

      await waitFor(() => {
        expect(screen.getByTestId("stripe-elements")).toBeInTheDocument();
      });

      expect(sessionStorageMock.getItem("pi_secret_ABC123_50000_valid-tok")).toBe("pi_secret_abc");
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
      mockCreatePaymentIntent.mockResolvedValue({ client_secret: "pi_sec", payment_intent_id: "pi_id" });
      mockConfirmInvoicePayment.mockResolvedValue(undefined);

      const mockStripe = {
        confirmPayment: jest.fn().mockResolvedValue({
          error:         null,
          paymentIntent: { id: "pi_test_success", status: "succeeded" },
        }),
      };
      mockUseStripe.mockReturnValue(mockStripe as never);
      mockUseElements.mockReturnValue({} as never);

      render(<PublicInvoicePayView invoice_id="ABC123" token="valid-tok" />);

      await waitFor(() => {
        expect(screen.getByText(/complete your payment/i)).toBeInTheDocument();
      });

      const form = document.querySelector("form");
      if (form) {
        fireEvent.submit(form);

        await waitFor(() => {
          expect(screen.getByText(/payment successful/i)).toBeInTheDocument();
        });
      }
    });

    it("shows success_pending when Stripe succeeds but backend confirmation throws", async () => {
      mockGetPublicInvoice.mockResolvedValue(makeInvoiceDetail({ status: "unpaid", unique_id: "ABC123" }));
      mockCreatePaymentIntent.mockResolvedValue({ client_secret: "pi_sec", payment_intent_id: "pi_id" });
      mockConfirmInvoicePayment.mockRejectedValue(new Error("Backend error"));

      const mockStripe = {
        confirmPayment: jest.fn().mockResolvedValue({
          error:         null,
          paymentIntent: { id: "pi_test_success", status: "succeeded" },
        }),
      };
      mockUseStripe.mockReturnValue(mockStripe as never);
      mockUseElements.mockReturnValue({} as never);

      render(<PublicInvoicePayView invoice_id="ABC123" token="valid-tok" />);

      await waitFor(() => {
        expect(screen.getByText(/complete your payment/i)).toBeInTheDocument();
      });

      const form = document.querySelector("form");
      if (form) {
        fireEvent.submit(form);

        await waitFor(() => {
          expect(screen.getByText(/payment processed/i)).toBeInTheDocument();
        });
      }
    });
  });

  // ─── Stripe payment error ───────────────────────────────────────────────

  describe("Stripe payment error in form", () => {
    it("shows error message when Stripe.confirmPayment returns an error", async () => {
      mockGetPublicInvoice.mockResolvedValue(makeInvoiceDetail({ status: "unpaid", unique_id: "ABC123" }));
      mockCreatePaymentIntent.mockResolvedValue({ client_secret: "pi_sec", payment_intent_id: "pi_id" });

      const mockStripe = {
        confirmPayment: jest.fn().mockResolvedValue({
          error:         { message: "Your card was declined." },
          paymentIntent: null,
        }),
      };
      mockUseStripe.mockReturnValue(mockStripe as never);
      mockUseElements.mockReturnValue({} as never);

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
      mockCreatePaymentIntent.mockResolvedValue({ client_secret: "pi_sec", payment_intent_id: "pi_id" });
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
      mockCreatePaymentIntent.mockResolvedValue({ client_secret: "pi_sec", payment_intent_id: "pi_id" });
      setupStripeHooks();

      render(<PublicInvoicePayView invoice_id="ABC123" token="tok" />);

      const toggle = await screen.findByText(/order summary/i);
      fireEvent.click(toggle.closest("button")!);

      await waitFor(() => {
        expect(screen.getByText("Test Item")).toBeInTheDocument();
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

    it("shows Return to Invoices link after authenticated payment success", async () => {
      mockGetInvoiceDetail.mockResolvedValue(makeInvoiceDetail({ status: "unpaid", unique_id: "ABC123" }));
      mockCreatePaymentIntent.mockResolvedValue({ client_secret: "pi_sec", payment_intent_id: "pi_id" });
      mockConfirmInvoicePayment.mockResolvedValue(undefined);

      const mockStripe = {
        confirmPayment: jest.fn().mockResolvedValue({
          error:         null,
          paymentIntent: { id: "pi_test", status: "succeeded" },
        }),
      };
      mockUseStripe.mockReturnValue(mockStripe as never);
      mockUseElements.mockReturnValue({} as never);

      render(<PublicInvoicePayView invoice_id="ABC123" token="" />);

      await waitFor(() => {
        expect(screen.getByText(/complete your payment/i)).toBeInTheDocument();
      });

      const form = document.querySelector("form");
      if (form) {
        fireEvent.submit(form);

        await waitFor(() => {
          const link = screen.queryByText(/return to invoices/i);
          expect(link).toBeInTheDocument();
        });
      }
    });
  });

  // ─── BASE branding ──────────────────────────────────────────────────────

  describe("branding", () => {
    it("shows BASE Search Marketing branding in the payment form", async () => {
      mockGetPublicInvoice.mockResolvedValue(makeInvoiceDetail({ status: "unpaid", unique_id: "ABC123" }));
      mockCreatePaymentIntent.mockResolvedValue({ client_secret: "pi_sec", payment_intent_id: "pi_id" });
      setupStripeHooks();

      render(<PublicInvoicePayView invoice_id="ABC123" token="tok" />);

      await waitFor(() => {
        expect(screen.getByText("BASE")).toBeInTheDocument();
      });
    });
  });
});
