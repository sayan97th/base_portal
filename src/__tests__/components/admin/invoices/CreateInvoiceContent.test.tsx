/**
 * Regression coverage for the reported bug: creating an invoice from the
 * admin "Create Invoice" page failed with a raw backend error ("Integrity
 * constraint violation: 1062 Duplicate entry 'BSM-0927' for key
 * invoices_invoice_number_unique") once earlier invoices had been deleted.
 * The invoice number is generated entirely server-side (see
 * InvoiceNumberGeneratorTest.php on the API), so these tests cover the
 * frontend's part of the fix: a successful create still navigates to the
 * new invoice, and whatever error the API returns surfaces as readable text
 * instead of the page crashing or failing silently.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CreateInvoiceContent from "@/components/admin/invoices/CreateInvoiceContent";
import { createAdminInvoice } from "@/services/admin/invoice.service";
import type { AdminUser } from "@/types/admin";

// ─── Module mocks ────────────────────────────────────────────────────────────

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("next/link", () => {
  const Link = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  Link.displayName = "Link";
  return Link;
});

// flatpickr (used by DatePickerField) relies on DOM APIs absent in jsdom.
// The `date_due` field already has a valid default in component state, so
// the mocked instance never needs to report a real selection.
jest.mock("flatpickr", () => ({
  __esModule: true,
  default: jest.fn(() => ({ destroy: jest.fn() })),
}));

jest.mock("@/services/admin/invoice.service", () => ({
  createAdminInvoice: jest.fn(),
}));

const FAKE_CLIENT = {
  id: 42,
  first_name: "Jane",
  last_name: "Doe",
  email: "jane@example.com",
  company: "Acme Corp",
} as unknown as AdminUser;

// ClientSelectDropdown does its own async client search; stub it with a
// single button so tests can select a client synchronously. The `error`
// prop is forwarded so client-side validation messages still render.
jest.mock("@/components/admin/invoices/ClientSelectDropdown", () => {
  const MockClientSelectDropdown = ({
    on_select,
    error,
  }: {
    on_select: (client: AdminUser) => void;
    error?: string;
  }) => (
    <div>
      <button type="button" onClick={() => on_select(FAKE_CLIENT)}>
        Select fake client
      </button>
      {error && <p>{error}</p>}
    </div>
  );
  MockClientSelectDropdown.displayName = "MockClientSelectDropdown";
  return { __esModule: true, default: MockClientSelectDropdown };
});

const mockCreateAdminInvoice = createAdminInvoice as jest.MockedFunction<typeof createAdminInvoice>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fillMinimumValidForm() {
  fireEvent.click(screen.getByText("Select fake client"));

  fireEvent.change(screen.getByPlaceholderText("e.g. SEO Consulting Package"), {
    target: { value: "Link Building Package" },
  });
  fireEvent.change(screen.getByPlaceholderText("0.00"), {
    target: { value: "500" },
  });
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: /generate invoice/i }));
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("CreateInvoiceContent", () => {
  it("does not submit and shows a validation error when no client is selected", async () => {
    render(<CreateInvoiceContent />);

    fireEvent.change(screen.getByPlaceholderText("e.g. SEO Consulting Package"), {
      target: { value: "Link Building Package" },
    });
    fireEvent.change(screen.getByPlaceholderText("0.00"), {
      target: { value: "500" },
    });

    submit();

    await waitFor(() => {
      expect(screen.getByText("Please select a client to invoice")).toBeInTheDocument();
    });

    expect(mockCreateAdminInvoice).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("navigates to the new invoice's detail page after a successful submission", async () => {
    mockCreateAdminInvoice.mockResolvedValueOnce({
      id: "new-inv-1",
      invoice_number: "BSM-0006",
    } as never);

    render(<CreateInvoiceContent />);
    fillMinimumValidForm();
    submit();

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/admin/invoices/new-inv-1");
    });

    expect(mockCreateAdminInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 42,
        line_items: [
          expect.objectContaining({ item_name: "Link Building Package", price: 500 }),
        ],
      })
    );
  });

  it("shows the API's error message and does not navigate when invoice creation fails", async () => {
    // Mirrors what api-client throws once the backend returns a JSON error
    // body — e.g. the duplicate invoice_number failure the client reported.
    mockCreateAdminInvoice.mockRejectedValueOnce({
      message: "Duplicate invoice number, please try again.",
    });

    render(<CreateInvoiceContent />);
    fillMinimumValidForm();
    submit();

    await waitFor(() => {
      expect(screen.getByText("Duplicate invoice number, please try again.")).toBeInTheDocument();
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("falls back to a generic error message when the API error has no message", async () => {
    mockCreateAdminInvoice.mockRejectedValueOnce({});

    render(<CreateInvoiceContent />);
    fillMinimumValidForm();
    submit();

    await waitFor(() => {
      expect(
        screen.getByText("Failed to create invoice. Please try again.")
      ).toBeInTheDocument();
    });
  });

  it("re-enables the submit button after a failed submission so the admin can retry", async () => {
    mockCreateAdminInvoice.mockRejectedValueOnce({ message: "Server error." });

    render(<CreateInvoiceContent />);
    fillMinimumValidForm();
    submit();

    await waitFor(() => {
      expect(screen.getByText("Server error.")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /generate invoice/i })).not.toBeDisabled();
  });
});
