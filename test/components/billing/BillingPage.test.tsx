import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import BillingPage from "@/components/billing/BillingPage";

/**
 * Confirms BillingPage wires a working `onRequestFreshSecret` into
 * PaymentMethodForm. That callback is what lets the form recover from a
 * stale, already-confirmed SetupIntent without the user having to leave and
 * re-open the "Add Payment Method" page (see PaymentMethodForm.test.tsx for
 * the consuming side of this contract).
 */

jest.mock("@/lib/api-client", () => ({
  getToken: jest.fn().mockReturnValue("test-token"),
}));

jest.mock("@/services/client/payment-profile.service", () => ({
  paymentProfileService: {
    fetchPaymentProfiles: jest.fn().mockResolvedValue([]),
    deletePaymentProfile: jest.fn(),
    setDefaultPaymentProfile: jest.fn(),
  },
}));

jest.mock("@/lib/stripe", () => ({
  getStripe: jest.fn().mockReturnValue(null),
}));

jest.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/billing/PaymentMethodForm", () => {
  return function MockPaymentMethodForm({
    client_secret,
    onRequestFreshSecret,
  }: {
    client_secret: string;
    onRequestFreshSecret: () => Promise<string>;
  }) {
    const [latest_secret, setLatestSecret] = React.useState(client_secret);
    return (
      <div>
        <p data-testid="active-secret">{latest_secret}</p>
        <button
          onClick={async () => {
            const fresh = await onRequestFreshSecret();
            setLatestSecret(fresh);
          }}
        >
          Request Fresh Secret
        </button>
      </div>
    );
  };
});

const mockFetch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = mockFetch as unknown as typeof fetch;
});

describe("BillingPage", () => {
  it("fetches a SetupIntent client_secret and opens the Add Payment Method form", async () => {
    mockFetch.mockResolvedValueOnce({
      ok:   true,
      json: jest.fn().mockResolvedValue({ client_secret: "seti_first_secret" }),
    });

    render(<BillingPage />);

    await waitFor(() => expect(screen.getByText("No payment methods yet")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Add your first card"));

    await waitFor(() => expect(screen.getByTestId("active-secret")).toHaveTextContent("seti_first_secret"));

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/stripe/setup-intent",
      expect.objectContaining({
        method:  "POST",
        headers: expect.objectContaining({ Authorization: "Bearer test-token" }),
      })
    );
  });

  it("passes a working onRequestFreshSecret that fetches a brand new SetupIntent on demand", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok:   true,
        json: jest.fn().mockResolvedValue({ client_secret: "seti_first_secret" }),
      })
      .mockResolvedValueOnce({
        ok:   true,
        json: jest.fn().mockResolvedValue({ client_secret: "seti_second_secret" }),
      });

    render(<BillingPage />);

    await waitFor(() => screen.getByText("Add your first card"));
    fireEvent.click(screen.getByText("Add your first card"));
    await waitFor(() => expect(screen.getByTestId("active-secret")).toHaveTextContent("seti_first_secret"));

    fireEvent.click(screen.getByText("Request Fresh Secret"));

    await waitFor(() => expect(screen.getByTestId("active-secret")).toHaveTextContent("seti_second_secret"));
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("shows an error banner and stays on the list view when the SetupIntent request fails", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, json: jest.fn().mockResolvedValue({}) });

    render(<BillingPage />);

    await waitFor(() => screen.getByText("Add your first card"));
    fireEvent.click(screen.getByText("Add your first card"));

    await waitFor(() =>
      expect(screen.getByText("Unable to open the payment form. Please try again.")).toBeInTheDocument()
    );
    expect(screen.queryByTestId("active-secret")).not.toBeInTheDocument();
  });
});
