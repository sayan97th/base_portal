import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminInvoicesContent from "@/components/admin/invoices/AdminInvoicesContent";
import { listAdminInvoices } from "@/services/admin/invoice.service";
import type { AdminInvoice, InvoiceStatus, PaginatedResponse } from "@/types/admin";

// ─── Module mocks ────────────────────────────────────────────────────────────

jest.mock("@/services/admin/invoice.service", () => ({
  listAdminInvoices: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("next/link", () => {
  const Link = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  Link.displayName = "Link";
  return Link;
});

// flatpickr (used by InvoiceFiltersBar) relies on DOM APIs absent in jsdom
jest.mock("flatpickr", () => ({
  __esModule: true,
  default: jest.fn(() => ({
    destroy: jest.fn(),
    setDate: jest.fn(),
    clear: jest.fn(),
    set: jest.fn(),
  })),
}));
jest.mock("flatpickr/dist/flatpickr.min.css", () => ({}));

// useDebounce resolves immediately in tests
jest.mock("@/hooks/useDebounce", () => ({
  useDebounce: (value: unknown) => value,
}));

const mockListAdminInvoices = listAdminInvoices as jest.MockedFunction<typeof listAdminInvoices>;

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeInvoice(overrides: Partial<AdminInvoice> = {}): AdminInvoice {
  return {
    id: "inv-1",
    unique_id: "ABCD1234",
    invoice_number: "BSM-0001",
    user_id: 10,
    order_id: "",
    status: "paid",
    payment_method: "Credit Card",
    currency_type: "usd",
    subtotal_amount: 500,
    total_amount: 500,
    credit_amount: 0,
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

function makePaginated(
  items: AdminInvoice[] = [],
  overrides: Partial<PaginatedResponse<AdminInvoice>> = {}
): PaginatedResponse<AdminInvoice> {
  return {
    data: items,
    current_page: 1,
    last_page: 1,
    total: items.length,
    ...overrides,
  };
}

/** Find the table status badge (a <span>) for the given label, ignoring filter pills (<button>). */
function findStatusBadge(label: string): HTMLElement | undefined {
  return screen.getAllByText(label).find((el) => el.tagName === "SPAN");
}

beforeEach(() => {
  jest.clearAllMocks();
  mockListAdminInvoices.mockResolvedValue(makePaginated([]));
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("AdminInvoicesContent — Stripe-aligned statuses", () => {
  // Each row uses the status label as its badge text.
  const STATUS_CASES: { status: InvoiceStatus; label: string }[] = [
    { status: "paid", label: "Paid" },
    { status: "refund", label: "Refund" },
    { status: "partial_refund", label: "Partial Refund" },
    { status: "dispute", label: "Dispute" },
    { status: "void", label: "Void" },
  ];

  it.each(STATUS_CASES)("renders the $label badge for a $status invoice", async ({ status, label }) => {
    mockListAdminInvoices.mockResolvedValue(makePaginated([makeInvoice({ status })]));

    render(<AdminInvoicesContent />);

    await waitFor(() => {
      expect(findStatusBadge(label)).toBeInTheDocument();
    });
  });

  it("exposes Partial Refund and Dispute as filter options", async () => {
    render(<AdminInvoicesContent />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Partial Refund" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Dispute" })).toBeInTheDocument();
    });
  });

  it("fetches with status=partial_refund when the Partial Refund filter is selected", async () => {
    render(<AdminInvoicesContent />);

    const pill = await screen.findByRole("button", { name: "Partial Refund" });
    fireEvent.click(pill);

    await waitFor(() => {
      expect(mockListAdminInvoices).toHaveBeenCalledWith(
        expect.objectContaining({ status: "partial_refund" })
      );
    });
  });

  it("fetches with status=dispute when the Dispute filter is selected", async () => {
    render(<AdminInvoicesContent />);

    const pill = await screen.findByRole("button", { name: "Dispute" });
    fireEvent.click(pill);

    await waitFor(() => {
      expect(mockListAdminInvoices).toHaveBeenCalledWith(
        expect.objectContaining({ status: "dispute" })
      );
    });
  });

  it("renders a partially refunded invoice alongside its customer", async () => {
    mockListAdminInvoices.mockResolvedValue(
      makePaginated([
        makeInvoice({ id: "inv-pr", status: "partial_refund", refund_amount: 200 }),
      ])
    );

    render(<AdminInvoicesContent />);

    await waitFor(() => {
      expect(screen.getByText("alice@example.com")).toBeInTheDocument();
      expect(findStatusBadge("Partial Refund")).toBeInTheDocument();
    });
  });
});
