import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import PaymentMethodForm from "@/components/billing/PaymentMethodForm";
import type { PaymentProfile } from "@/types/client/payment-profile";

/**
 * Regression coverage for the SetupIntent retry bug.
 *
 * Previously, when Stripe successfully confirmed a SetupIntent but the
 * backend save afterward failed (e.g. a transient error, or the Stripe
 * customer mismatch bug fixed alongside these tests), retrying the form
 * called stripe.confirmCardSetup() again with the same client_secret. A
 * SetupIntent can only be confirmed once, so Stripe rejected the retry with
 * "setup_intent_unexpected_state" ("You cannot confirm this SetupIntent
 * because it has already succeeded"), permanently stuck. These tests pin the
 * fix: a retry after a backend failure must reuse the already-confirmed
 * PaymentMethod and only retry the backend save, and a genuinely stale
 * SetupIntent must be recovered transparently via a fresh client_secret.
 */

// ─── Module mocks ─────────────────────────────────────────────────────────────

jest.mock("@/hooks/useBillingAddress", () => ({
  useBillingAddress: jest.fn().mockReturnValue({
    saved_billing_address: null,
    has_saved_address: false,
  }),
}));

jest.mock("@/services/client/payment-profile.service", () => ({
  paymentProfileService: {
    createPaymentProfile: jest.fn(),
  },
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

const mockConfirmCardSetup = jest.fn();
const mockGetElement = jest.fn().mockReturnValue({});

jest.mock("@stripe/react-stripe-js", () => ({
  CardNumberElement: (props: { onChange?: (e: unknown) => void }) => {
    React.useEffect(() => {
      props.onChange?.({ complete: true, brand: "visa", error: undefined });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return <div data-testid="card-number-element" />;
  },
  CardExpiryElement: (props: { onChange?: (e: unknown) => void }) => {
    React.useEffect(() => {
      props.onChange?.({ complete: true, error: undefined });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return <div data-testid="card-expiry-element" />;
  },
  CardCvcElement: (props: { onChange?: (e: unknown) => void }) => {
    React.useEffect(() => {
      props.onChange?.({ complete: true, error: undefined });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return <div data-testid="card-cvc-element" />;
  },
  useStripe: jest.fn(),
  useElements: jest.fn(),
}));

// ─── Imports after mocks ──────────────────────────────────────────────────────

import { paymentProfileService } from "@/services/client/payment-profile.service";
import { useStripe, useElements } from "@stripe/react-stripe-js";

const mockCreatePaymentProfile = paymentProfileService.createPaymentProfile as jest.MockedFunction<
  typeof paymentProfileService.createPaymentProfile
>;
const mockUseStripe = useStripe as jest.MockedFunction<typeof useStripe>;
const mockUseElements = useElements as jest.MockedFunction<typeof useElements>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeProfile(overrides: Partial<PaymentProfile> = {}): PaymentProfile {
  return {
    id: "profile-1",
    stripe_payment_method_id: "pm_new_card",
    card_brand: "visa",
    last_four: "4242",
    expiry_month: "12",
    expiry_year: "2030",
    cardholder_name: "Jane Doe",
    billing_address: null,
    is_default: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

async function fillRequiredBillingFields() {
  fireEvent.change(screen.getByPlaceholderText("123 Main St"), { target: { value: "123 Main St" } });
  fireEvent.change(screen.getByPlaceholderText("New York"), { target: { value: "Boise" } });
  fireEvent.change(screen.getByPlaceholderText("Search state…"), { target: { value: "Idaho" } });
  fireEvent.change(screen.getByPlaceholderText("10001"), { target: { value: "83701" } });
}

function renderForm(overrides: Partial<React.ComponentProps<typeof PaymentMethodForm>> = {}) {
  const on_back = jest.fn();
  const on_success = jest.fn();
  const on_request_fresh_secret = jest.fn().mockResolvedValue("seti_fresh_secret");

  const utils = render(
    <PaymentMethodForm
      client_secret="seti_original_secret"
      is_first_card={true}
      onBack={on_back}
      onSuccess={on_success}
      onRequestFreshSecret={on_request_fresh_secret}
      {...overrides}
    />
  );

  return { ...utils, on_back, on_success, on_request_fresh_secret };
}

async function submitForm() {
  fireEvent.click(screen.getByRole("button", { name: /add payment method/i }));
}

beforeEach(() => {
  jest.clearAllMocks();

  mockUseStripe.mockReturnValue({
    confirmCardSetup: mockConfirmCardSetup,
  } as unknown as ReturnType<typeof useStripe>);

  mockUseElements.mockReturnValue({
    getElement: mockGetElement,
  } as unknown as ReturnType<typeof useElements>);
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("PaymentMethodForm", () => {
  it("confirms the SetupIntent once and saves the profile on a normal successful submit", async () => {
    mockConfirmCardSetup.mockResolvedValueOnce({
      setupIntent: { payment_method: "pm_new_card" },
      error: undefined,
    });
    mockCreatePaymentProfile.mockResolvedValueOnce(makeProfile());

    const { on_success } = renderForm();
    await fillRequiredBillingFields();
    await submitForm();

    await waitFor(() => expect(on_success).toHaveBeenCalledTimes(1));
    expect(mockConfirmCardSetup).toHaveBeenCalledTimes(1);
    expect(mockConfirmCardSetup).toHaveBeenCalledWith("seti_original_secret", expect.any(Object));
    expect(mockCreatePaymentProfile).toHaveBeenCalledTimes(1);
  });

  it("retries only the backend save, without re-confirming Stripe, after a backend failure", async () => {
    mockConfirmCardSetup.mockResolvedValueOnce({
      setupIntent: { payment_method: "pm_new_card" },
      error: undefined,
    });
    mockCreatePaymentProfile
      .mockRejectedValueOnce(new Error("This payment method is already associated with a different account."))
      .mockResolvedValueOnce(makeProfile());

    const { on_success } = renderForm();
    await fillRequiredBillingFields();

    // First attempt: Stripe confirms, backend save fails.
    await submitForm();
    await waitFor(() =>
      expect(
        screen.getByText("This payment method is already associated with a different account.")
      ).toBeInTheDocument()
    );
    expect(mockConfirmCardSetup).toHaveBeenCalledTimes(1);
    expect(mockCreatePaymentProfile).toHaveBeenCalledTimes(1);

    // Retry: must NOT call confirmCardSetup again (that SetupIntent already
    // succeeded and Stripe would reject a second confirmation), only retry
    // the backend save with the PaymentMethod obtained the first time.
    await submitForm();
    await waitFor(() => expect(on_success).toHaveBeenCalledTimes(1));

    expect(mockConfirmCardSetup).toHaveBeenCalledTimes(1);
    expect(mockCreatePaymentProfile).toHaveBeenCalledTimes(2);
    expect(mockCreatePaymentProfile).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ stripe_payment_method_id: "pm_new_card" })
    );
  });

  it("requests a fresh SetupIntent and surfaces a friendly message when the current one is already confirmed", async () => {
    mockConfirmCardSetup.mockResolvedValueOnce({
      setupIntent: undefined,
      error: { code: "setup_intent_unexpected_state", message: "You cannot confirm this SetupIntent because it has already succeeded." },
    });

    const { on_request_fresh_secret } = renderForm();
    await fillRequiredBillingFields();
    await submitForm();

    await waitFor(() => expect(on_request_fresh_secret).toHaveBeenCalledTimes(1));
    expect(
      screen.getByText("Your session timed out. Please try submitting again.")
    ).toBeInTheDocument();
    expect(mockCreatePaymentProfile).not.toHaveBeenCalled();
  });

  it("shows the Stripe error message and does not call the backend for any other Stripe error", async () => {
    mockConfirmCardSetup.mockResolvedValueOnce({
      setupIntent: undefined,
      error: { code: "card_declined", message: "Your card was declined." },
    });

    renderForm();
    await fillRequiredBillingFields();
    await submitForm();

    await waitFor(() => expect(screen.getByText("Your card was declined.")).toBeInTheDocument());
    expect(mockCreatePaymentProfile).not.toHaveBeenCalled();
  });

  it("does not confirm the SetupIntent a second time on a rapid double submit", async () => {
    let resolve_confirm: (value: unknown) => void = () => {};
    mockConfirmCardSetup.mockReturnValueOnce(
      new Promise((resolve) => {
        resolve_confirm = resolve;
      })
    );
    mockCreatePaymentProfile.mockResolvedValueOnce(makeProfile());

    renderForm();
    await fillRequiredBillingFields();

    // Fire two submits back to back before the first one resolves. Grab the
    // button once up front: after the first click its accessible name changes
    // to "Saving...", so re-querying by the original name would simply fail
    // to find it rather than exercising the guard this test is checking.
    const submit_button = screen.getByRole("button", { name: /add payment method/i });
    fireEvent.click(submit_button);
    fireEvent.click(submit_button);

    await act(async () => {
      resolve_confirm({ setupIntent: { payment_method: "pm_new_card" }, error: undefined });
    });

    await waitFor(() => expect(mockCreatePaymentProfile).toHaveBeenCalledTimes(1));
    expect(mockConfirmCardSetup).toHaveBeenCalledTimes(1);
  });

  it("blocks submission and shows field errors when required billing address fields are missing", async () => {
    renderForm();
    await submitForm();

    expect(screen.getByText("Street address is required.")).toBeInTheDocument();
    expect(screen.getByText("City is required.")).toBeInTheDocument();
    expect(screen.getByText("Postal / ZIP code is required.")).toBeInTheDocument();
    expect(mockConfirmCardSetup).not.toHaveBeenCalled();
  });
});
