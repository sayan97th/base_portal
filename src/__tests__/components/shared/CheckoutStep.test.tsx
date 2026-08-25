import React, { useRef, useState } from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import CheckoutStep, {
  type BillingAddress,
  type CheckoutStepHandle,
} from "@/components/shared/CheckoutStep";

/**
 * Regression coverage: saving a new card from the checkout "Save this card
 * for future purchases" option used to omit the billing address entirely
 * (paymentProfileService.createPaymentProfile was called with only
 * stripe_payment_method_id, cardholder_name, and is_default). Cards saved
 * this way ended up with no billing address on file, unlike cards added
 * through the dedicated "Add Payment Method" page. This test pins that the
 * billing address entered at checkout is now included in that save.
 */

jest.mock("@/hooks/useBillingAddress", () => ({
  useBillingAddress: jest.fn(),
}));

jest.mock("@/services/client/payment-profile.service", () => ({
  paymentProfileService: {
    fetchPaymentProfiles: jest.fn().mockResolvedValue([]),
    createPaymentProfile: jest.fn().mockResolvedValue({ id: "profile-1" }),
  },
}));

jest.mock("@/services/client/credits.service", () => ({
  creditsService: {
    fetchCreditBalance: jest.fn().mockResolvedValue({ balance: 0 }),
    payWithCredits: jest.fn(),
  },
}));

jest.mock("@/services/client/stripe.service", () => ({
  createPaymentIntent: jest.fn(),
}));

jest.mock("@/components/shared/SearchableSelect", () => {
  return function MockSearchableSelect({
    value,
    onChange,
    placeholder,
  }: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  }) {
    return (
      <input
        aria-label="State / Province"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  };
});

const mockConfirmCardPayment = jest.fn();
const mockGetElement = jest.fn().mockReturnValue({});

jest.mock("@stripe/react-stripe-js", () => ({
  CardNumberElement: () => <div data-testid="card-number-element" />,
  CardExpiryElement: () => <div data-testid="card-expiry-element" />,
  CardCvcElement: () => <div data-testid="card-cvc-element" />,
  useStripe: jest.fn(),
  useElements: jest.fn(),
}));

import { useBillingAddress } from "@/hooks/useBillingAddress";
import { paymentProfileService } from "@/services/client/payment-profile.service";
import { createPaymentIntent } from "@/services/client/stripe.service";
import { useStripe, useElements } from "@stripe/react-stripe-js";

const mockUseBillingAddress = useBillingAddress as jest.MockedFunction<typeof useBillingAddress>;
const mockCreatePaymentProfile = paymentProfileService.createPaymentProfile as jest.MockedFunction<
  typeof paymentProfileService.createPaymentProfile
>;
const mockCreatePaymentIntent = createPaymentIntent as jest.MockedFunction<typeof createPaymentIntent>;
const mockUseStripe = useStripe as jest.MockedFunction<typeof useStripe>;
const mockUseElements = useElements as jest.MockedFunction<typeof useElements>;

// ─── Test harness: mirrors how the real product pages wire billing_address ────

function Harness({
  onComplete,
  onPayLater,
  onPayLaterSelectionChange,
}: {
  onComplete: (payment_intent_id: string, is_using_saved: boolean) => void;
  onPayLater?: () => void;
  onPayLaterSelectionChange?: (is_pay_later_selected: boolean) => void;
}) {
  const [billing_address, setBillingAddress] = useState<BillingAddress>({
    address: "",
    city: "",
    country: "United States",
    state: "",
    postal_code: "",
    company: "",
  });
  const checkout_ref = useRef<CheckoutStepHandle>(null);

  return (
    <>
      <CheckoutStep
        ref={checkout_ref}
        billing_address={billing_address}
        onBillingChange={(field, value) => setBillingAddress((prev) => ({ ...prev, [field]: value }))}
        onPrevious={() => {}}
        onComplete={onComplete}
        onPayLater={onPayLater}
        onPayLaterSelectionChange={onPayLaterSelectionChange}
        total_amount={100}
      />
      <button onClick={() => checkout_ref.current?.triggerSubmit()}>Submit Checkout</button>
    </>
  );
}

beforeEach(() => {
  jest.clearAllMocks();

  mockUseBillingAddress.mockReturnValue({
    saved_billing_address: null,
    is_loading: false,
    has_saved_address: false,
  });

  mockUseStripe.mockReturnValue({
    confirmCardPayment: mockConfirmCardPayment,
  } as unknown as ReturnType<typeof useStripe>);

  mockUseElements.mockReturnValue({
    getElement: mockGetElement,
  } as unknown as ReturnType<typeof useElements>);

  mockCreatePaymentIntent.mockResolvedValue({
    client_secret: "pi_secret_abc",
    payment_intent_id: "pi_abc",
  });

  mockConfirmCardPayment.mockResolvedValue({
    paymentIntent: { id: "pi_abc", status: "succeeded", payment_method: "pm_new_card" },
    error: undefined,
  });
});

describe("CheckoutStep — save card for future purchases", () => {
  it("includes the billing address entered at checkout when saving the new card", async () => {
    const on_complete = jest.fn();
    render(<Harness onComplete={on_complete} />);

    // With no saved profiles, "Add a new card" is selected by default and its
    // billing address section is shown immediately.
    await waitFor(() => expect(screen.getByPlaceholderText("123 Main St")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("Name on Card"), { target: { value: "Jane Doe" } });
    fireEvent.change(screen.getByPlaceholderText("123 Main St"), { target: { value: "456 Oak Ave" } });
    fireEvent.change(screen.getByPlaceholderText("New York"), { target: { value: "Boise" } });
    fireEvent.change(screen.getByPlaceholderText("Search state…"), { target: { value: "Idaho" } });
    fireEvent.change(screen.getByPlaceholderText("10001"), { target: { value: "83701" } });

    fireEvent.click(screen.getByText("Save this card for future purchases"));

    await act(async () => {
      fireEvent.click(screen.getByText("Submit Checkout"));
    });

    await waitFor(() => expect(on_complete).toHaveBeenCalledWith("pi_abc", false));

    expect(mockCreatePaymentProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        stripe_payment_method_id: "pm_new_card",
        cardholder_name: "Jane Doe",
        billing_address: expect.objectContaining({
          address_line1: "456 Oak Ave",
          city: "Boise",
          state: "Idaho",
          postal_code: "83701",
          country: "US",
        }),
      })
    );
  });

  it("does not attempt to save the card when the checkbox is left unchecked", async () => {
    const on_complete = jest.fn();
    render(<Harness onComplete={on_complete} />);

    await waitFor(() => expect(screen.getByPlaceholderText("123 Main St")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("Name on Card"), { target: { value: "Jane Doe" } });
    fireEvent.change(screen.getByPlaceholderText("123 Main St"), { target: { value: "456 Oak Ave" } });
    fireEvent.change(screen.getByPlaceholderText("New York"), { target: { value: "Boise" } });
    fireEvent.change(screen.getByPlaceholderText("Search state…"), { target: { value: "Idaho" } });
    fireEvent.change(screen.getByPlaceholderText("10001"), { target: { value: "83701" } });

    await act(async () => {
      fireEvent.click(screen.getByText("Submit Checkout"));
    });

    await waitFor(() => expect(on_complete).toHaveBeenCalledWith("pi_abc", false));
    expect(mockCreatePaymentProfile).not.toHaveBeenCalled();
  });

  it("does not block order completion when saving the card fails", async () => {
    mockCreatePaymentProfile.mockRejectedValueOnce(
      new Error("This payment method is already associated with a different account.")
    );
    const on_complete = jest.fn();
    const console_error_spy = jest.spyOn(console, "error").mockImplementation(() => {});

    render(<Harness onComplete={on_complete} />);

    await waitFor(() => expect(screen.getByPlaceholderText("123 Main St")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("Name on Card"), { target: { value: "Jane Doe" } });
    fireEvent.change(screen.getByPlaceholderText("123 Main St"), { target: { value: "456 Oak Ave" } });
    fireEvent.change(screen.getByPlaceholderText("New York"), { target: { value: "Boise" } });
    fireEvent.change(screen.getByPlaceholderText("Search state…"), { target: { value: "Idaho" } });
    fireEvent.change(screen.getByPlaceholderText("10001"), { target: { value: "83701" } });
    fireEvent.click(screen.getByText("Save this card for future purchases"));

    await act(async () => {
      fireEvent.click(screen.getByText("Submit Checkout"));
    });

    await waitFor(() => expect(on_complete).toHaveBeenCalledWith("pi_abc", false));
    expect(console_error_spy).toHaveBeenCalledWith(
      "[CheckoutStep] Failed to save card for future use.",
      expect.any(Error)
    );

    console_error_spy.mockRestore();
  });
});

describe("CheckoutStep — Pay Later selection", () => {
  it("reports the Pay Later selection to the parent when chosen and cleared", async () => {
    const on_pay_later_selection_change = jest.fn();
    render(
      <Harness
        onComplete={jest.fn()}
        onPayLater={jest.fn()}
        onPayLaterSelectionChange={on_pay_later_selection_change}
      />
    );

    await waitFor(() => expect(screen.getByText("Pay Later")).toBeInTheDocument());
    on_pay_later_selection_change.mockClear();

    fireEvent.click(screen.getByText("Pay Later"));
    await waitFor(() => expect(on_pay_later_selection_change).toHaveBeenCalledWith(true));
    on_pay_later_selection_change.mockClear();

    // Clicking the selected Pay Later option again deselects it.
    fireEvent.click(screen.getByText("Pay Later"));
    await waitFor(() => expect(on_pay_later_selection_change).toHaveBeenCalledWith(false));
  });

  it("calls onPayLater instead of charging a card when Pay Later is selected and submitted", async () => {
    const on_complete = jest.fn();
    const on_pay_later = jest.fn();
    render(<Harness onComplete={on_complete} onPayLater={on_pay_later} />);

    await waitFor(() => expect(screen.getByText("Pay Later")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Pay Later"));

    await act(async () => {
      fireEvent.click(screen.getByText("Submit Checkout"));
    });

    expect(on_pay_later).toHaveBeenCalledTimes(1);
    expect(on_complete).not.toHaveBeenCalled();
    expect(mockConfirmCardPayment).not.toHaveBeenCalled();
  });
});
