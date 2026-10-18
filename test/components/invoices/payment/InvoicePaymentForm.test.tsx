/**
 * Tests for the invoice pay form: saved card selection, the new card form
 * (validation, billing details, save-for-future), the public share-link flow
 * and the error paths between the API, Stripe.js and the parent view.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import InvoicePaymentForm from "@/components/invoices/payment/InvoicePaymentForm";
import type { InvoiceDetail } from "@/components/invoices/invoiceData";
import type { PaymentProfile } from "@/types/client/payment-profile";

// ─── Module mocks ─────────────────────────────────────────────────────────────

jest.mock("@/services/client/invoice-card-payment.service", () => ({
  invoiceCardPaymentService: {
    createAuthenticatedPaymentIntent: jest.fn(),
    createPublicPaymentIntent: jest.fn(),
  },
}));

jest.mock("@/services/client/payment-profile.service", () => ({
  paymentProfileService: { createPaymentProfile: jest.fn() },
}));

type MockChangeHandler = (change_event: Record<string, unknown>) => void;

/** Card fields expose buttons so tests can simulate Stripe change events. */
function mockStripeField(test_id: string, complete_event: Record<string, unknown>) {
  return function MockStripeField({ onChange }: { onChange?: MockChangeHandler }) {
    return (
      <div data-testid={test_id}>
        <button type="button" onClick={() => onChange?.({ complete: true, error: undefined, ...complete_event })}>
          complete {test_id}
        </button>
        <button
          type="button"
          onClick={() => onChange?.({ complete: false, error: { message: `Invalid ${test_id}` }, brand: "unknown" })}
        >
          invalid {test_id}
        </button>
      </div>
    );
  };
}

jest.mock("@stripe/react-stripe-js", () => ({
  CardNumberElement: mockStripeField("card-number", { brand: "visa" }),
  CardExpiryElement: mockStripeField("card-expiry", {}),
  CardCvcElement: mockStripeField("card-cvc", {}),
  useStripe: jest.fn(),
  useElements: jest.fn(),
}));

import { invoiceCardPaymentService } from "@/services/client/invoice-card-payment.service";
import { paymentProfileService } from "@/services/client/payment-profile.service";
import { useStripe, useElements } from "@stripe/react-stripe-js";

const mockCardPaymentService = invoiceCardPaymentService as jest.Mocked<typeof invoiceCardPaymentService>;
const mockCreatePaymentProfile = paymentProfileService.createPaymentProfile as jest.MockedFunction<
  typeof paymentProfileService.createPaymentProfile
>;
const mockUseStripe = useStripe as jest.MockedFunction<typeof useStripe>;
const mockUseElements = useElements as jest.MockedFunction<typeof useElements>;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const CARD_NUMBER_ELEMENT = { element: "card-number" };

const INVOICE: InvoiceDetail = {
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
  line_items: [],
};

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
let mock_on_payment_authorized: jest.Mock;

function renderForm(props: Partial<React.ComponentProps<typeof InvoicePaymentForm>> = {}) {
  return render(
    <InvoicePaymentForm
      invoice={INVOICE}
      amount_due_cents={50000}
      is_authenticated
      token=""
      payment_profiles={[]}
      onPaymentAuthorized={mock_on_payment_authorized}
      {...props}
    />
  );
}

function fillNewCard({ cardholder_name = "Jane Client", postal_code = "" } = {}) {
  fireEvent.change(screen.getByLabelText("Name on card"), { target: { value: cardholder_name } });
  if (postal_code) {
    fireEvent.change(screen.getByLabelText("ZIP / Postal code"), { target: { value: postal_code } });
  }
  fireEvent.click(screen.getByText("complete card-number"));
  fireEvent.click(screen.getByText("complete card-expiry"));
  fireEvent.click(screen.getByText("complete card-cvc"));
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: /Pay \$500\.00/i }));
}

beforeEach(() => {
  jest.clearAllMocks();

  mock_confirm_card_payment = jest.fn().mockResolvedValue({
    paymentIntent: { id: "pi_123", status: "requires_capture", payment_method: "pm_new_card" },
  });
  mock_on_payment_authorized = jest.fn().mockResolvedValue(undefined);

  mockUseStripe.mockReturnValue({ confirmCardPayment: mock_confirm_card_payment } as never);
  mockUseElements.mockReturnValue({ getElement: jest.fn().mockReturnValue(CARD_NUMBER_ELEMENT) } as never);

  mockCardPaymentService.createAuthenticatedPaymentIntent.mockResolvedValue({
    client_secret: "pi_123_secret",
    payment_intent_id: "pi_123",
  });
  mockCardPaymentService.createPublicPaymentIntent.mockResolvedValue({
    client_secret: "pi_123_secret",
    payment_intent_id: "pi_123",
  });
  mockCreatePaymentProfile.mockResolvedValue(makeProfile({ id: "new-profile" }));
});

// ─── Saved cards ──────────────────────────────────────────────────────────────

describe("saved cards", () => {
  it("lists every saved card plus a new card option", () => {
    renderForm({
      payment_profiles: [makeProfile(), makeProfile({ id: "profile-2", last_four: "5555", card_brand: "mastercard", is_default: false })],
    });

    expect(screen.getByText("Choose a card")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Visa ending in 4242/i })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Mastercard ending in 5555/i })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: /Use a new card/i })).not.toBeChecked();
    expect(screen.getByText("Default")).toBeInTheDocument();
  });

  it("pays with a different saved card when selected", async () => {
    renderForm({
      payment_profiles: [
        makeProfile(),
        makeProfile({ id: "profile-2", stripe_payment_method_id: "pm_saved_2", last_four: "5555", is_default: false }),
      ],
    });

    fireEvent.click(screen.getByRole("radio", { name: /ending in 5555/i }));
    submit();

    await waitFor(() => expect(mock_on_payment_authorized).toHaveBeenCalledWith("pi_123"));
    expect(mockCardPaymentService.createAuthenticatedPaymentIntent).toHaveBeenCalledWith("B72E1872", {
      payment_profile_id: "profile-2",
    });
    expect(mock_confirm_card_payment).toHaveBeenCalledWith("pi_123_secret", { payment_method: "pm_saved_2" });
    expect(mockCreatePaymentProfile).not.toHaveBeenCalled();
  });

  it("switches between a saved card and the new card form", () => {
    renderForm({ payment_profiles: [makeProfile()] });

    expect(screen.queryByTestId("card-number")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: /Use a new card/i }));
    expect(screen.getByTestId("card-number")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: /Visa ending in 4242/i }));
    expect(screen.queryByTestId("card-number")).not.toBeInTheDocument();
  });

  it("hides saved cards for public share links even if provided", () => {
    renderForm({ is_authenticated: false, token: "share-token", payment_profiles: [makeProfile()] });

    expect(screen.queryByRole("radio", { name: /Visa ending in 4242/i })).not.toBeInTheDocument();
    expect(screen.getByTestId("card-number")).toBeInTheDocument();
  });
});

// ─── New card ─────────────────────────────────────────────────────────────────

describe("new card", () => {
  it("requires every field before creating a PaymentIntent", async () => {
    renderForm();

    submit();

    expect(await screen.findByText("Enter the name on the card.")).toBeInTheDocument();
    expect(screen.getByText("Enter your card number.")).toBeInTheDocument();
    expect(screen.getByText("Enter the card expiration date.")).toBeInTheDocument();
    expect(screen.getByText("Enter the card security code.")).toBeInTheDocument();
    expect(mockCardPaymentService.createAuthenticatedPaymentIntent).not.toHaveBeenCalled();
  });

  it("shows Stripe field errors and blocks submission", async () => {
    renderForm();

    fireEvent.change(screen.getByLabelText("Name on card"), { target: { value: "Jane Client" } });
    fireEvent.click(screen.getByText("invalid card-number"));
    fireEvent.click(screen.getByText("complete card-expiry"));
    fireEvent.click(screen.getByText("complete card-cvc"));

    expect(screen.getByText("Invalid card-number")).toBeInTheDocument();

    submit();

    await waitFor(() => expect(screen.getByText("Invalid card-number")).toBeInTheDocument());
    expect(mockCardPaymentService.createAuthenticatedPaymentIntent).not.toHaveBeenCalled();
  });

  it("clears the name error once the user types a name", async () => {
    renderForm();

    submit();
    expect(await screen.findByText("Enter the name on the card.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Name on card"), { target: { value: "Jane" } });
    expect(screen.queryByText("Enter the name on the card.")).not.toBeInTheDocument();
  });

  it("sends the cardholder name and postal code to Stripe", async () => {
    renderForm();

    fillNewCard({ cardholder_name: "  Jane Client  ", postal_code: "84043" });
    submit();

    await waitFor(() => expect(mock_on_payment_authorized).toHaveBeenCalledWith("pi_123"));
    expect(mockCardPaymentService.createAuthenticatedPaymentIntent).toHaveBeenCalledWith("B72E1872", { save_card: false });
    expect(mock_confirm_card_payment).toHaveBeenCalledWith("pi_123_secret", {
      payment_method: {
        card: CARD_NUMBER_ELEMENT,
        billing_details: { name: "Jane Client", address: { postal_code: "84043" } },
      },
    });
  });

  it("omits the address when no postal code is given", async () => {
    renderForm();

    fillNewCard();
    submit();

    await waitFor(() => expect(mock_confirm_card_payment).toHaveBeenCalled());
    const confirm_payload = mock_confirm_card_payment.mock.calls[0][1];
    expect(confirm_payload.payment_method.billing_details).toEqual({ name: "Jane Client" });
  });

  it("saves the card as default when the client opts in and has no cards", async () => {
    renderForm();

    fillNewCard();
    fireEvent.click(screen.getByRole("checkbox", { name: /Save this card for future payments/i }));
    submit();

    await waitFor(() => expect(mock_on_payment_authorized).toHaveBeenCalledWith("pi_123"));
    expect(mockCardPaymentService.createAuthenticatedPaymentIntent).toHaveBeenCalledWith("B72E1872", { save_card: true });
    expect(mockCreatePaymentProfile).toHaveBeenCalledWith({
      stripe_payment_method_id: "pm_new_card",
      cardholder_name: "Jane Client",
      is_default: true,
    });
  });

  it("saves the card as non-default when the client already has cards", async () => {
    mock_confirm_card_payment.mockResolvedValue({
      paymentIntent: { id: "pi_123", status: "requires_capture", payment_method: { id: "pm_object" } },
    });
    renderForm({ payment_profiles: [makeProfile()] });

    fireEvent.click(screen.getByRole("radio", { name: /Use a new card/i }));
    fillNewCard();
    fireEvent.click(screen.getByRole("checkbox", { name: /Save this card/i }));
    submit();

    await waitFor(() => expect(mockCreatePaymentProfile).toHaveBeenCalled());
    expect(mockCreatePaymentProfile).toHaveBeenCalledWith(
      expect.objectContaining({ stripe_payment_method_id: "pm_object", is_default: false })
    );
  });

  it("still completes the payment when saving the card fails", async () => {
    mockCreatePaymentProfile.mockRejectedValue({ status_code: 409 });
    renderForm();

    fillNewCard();
    fireEvent.click(screen.getByRole("checkbox", { name: /Save this card/i }));
    submit();

    await waitFor(() => expect(mock_on_payment_authorized).toHaveBeenCalledWith("pi_123"));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("does not save the card when the checkbox is unchecked", async () => {
    renderForm();

    fillNewCard();
    submit();

    await waitFor(() => expect(mock_on_payment_authorized).toHaveBeenCalled());
    expect(mockCreatePaymentProfile).not.toHaveBeenCalled();
  });
});

// ─── Public share link ────────────────────────────────────────────────────────

describe("public share link", () => {
  it("creates the PaymentIntent with the token and never offers to save the card", async () => {
    renderForm({ is_authenticated: false, token: "share-token" });

    expect(screen.queryByRole("checkbox", { name: /Save this card/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Sign in to pay with a saved card/i })).toHaveAttribute(
      "href",
      "/invoices/B72E1872/pay"
    );

    fillNewCard();
    submit();

    await waitFor(() => expect(mock_on_payment_authorized).toHaveBeenCalledWith("pi_123"));
    expect(mockCardPaymentService.createPublicPaymentIntent).toHaveBeenCalledWith("B72E1872", "share-token");
    expect(mockCardPaymentService.createAuthenticatedPaymentIntent).not.toHaveBeenCalled();
    expect(mockCreatePaymentProfile).not.toHaveBeenCalled();
  });
});

// ─── Error paths ──────────────────────────────────────────────────────────────

describe("error handling", () => {
  it("shows the API message when the PaymentIntent cannot be created", async () => {
    mockCardPaymentService.createAuthenticatedPaymentIntent.mockRejectedValue({
      message: "This card has expired. Please choose another card.",
      status_code: 422,
    });
    renderForm({ payment_profiles: [makeProfile()] });

    submit();

    expect(await screen.findByRole("alert")).toHaveTextContent("This card has expired. Please choose another card.");
    expect(mock_confirm_card_payment).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Pay \$500\.00/i })).toBeEnabled();
  });

  it("shows the Stripe decline message and lets the user retry", async () => {
    mock_confirm_card_payment
      .mockResolvedValueOnce({ error: { message: "Your card has insufficient funds." } })
      .mockResolvedValueOnce({ paymentIntent: { id: "pi_retry", status: "requires_capture", payment_method: "pm" } });
    renderForm({ payment_profiles: [makeProfile()] });

    submit();
    expect(await screen.findByRole("alert")).toHaveTextContent("Your card has insufficient funds.");
    expect(mock_on_payment_authorized).not.toHaveBeenCalled();

    submit();
    await waitFor(() => expect(mock_on_payment_authorized).toHaveBeenCalledWith("pi_retry"));
  });

  it.each(["requires_payment_method", "requires_action", "canceled", "processing"])(
    "does not record the payment when the intent status is %s",
    async (intent_status) => {
      mock_confirm_card_payment.mockResolvedValue({ paymentIntent: { id: "pi_123", status: intent_status } });
      renderForm({ payment_profiles: [makeProfile()] });

      submit();

      expect(await screen.findByRole("alert")).toHaveTextContent("The payment was not completed. Please try again.");
      expect(mock_on_payment_authorized).not.toHaveBeenCalled();
    }
  );

  it("accepts an automatically captured (succeeded) intent", async () => {
    mock_confirm_card_payment.mockResolvedValue({ paymentIntent: { id: "pi_auto", status: "succeeded" } });
    renderForm({ payment_profiles: [makeProfile()] });

    submit();

    await waitFor(() => expect(mock_on_payment_authorized).toHaveBeenCalledWith("pi_auto"));
  });

  it("disables the pay button while the payment is processing", async () => {
    let resolve_intent: (value: { client_secret: string; payment_intent_id: string }) => void = () => {};
    mockCardPaymentService.createAuthenticatedPaymentIntent.mockReturnValue(
      new Promise((resolve) => {
        resolve_intent = resolve;
      })
    );
    renderForm({ payment_profiles: [makeProfile()] });

    submit();

    const processing_button = await screen.findByRole("button", { name: /Processing payment/i });
    expect(processing_button).toBeDisabled();

    fireEvent.click(processing_button);
    expect(mockCardPaymentService.createAuthenticatedPaymentIntent).toHaveBeenCalledTimes(1);

    resolve_intent({ client_secret: "pi_123_secret", payment_intent_id: "pi_123" });
    await waitFor(() => expect(mock_on_payment_authorized).toHaveBeenCalled());
  });

  it("disables the pay button until Stripe has loaded", () => {
    mockUseStripe.mockReturnValue(null);
    renderForm({ payment_profiles: [makeProfile()] });

    expect(screen.getByRole("button", { name: /Pay \$500\.00/i })).toBeDisabled();
  });
});
