import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import InvoicesPage from "@/components/invoices/InvoicesPage";
import { invoicesService } from "@/services/client/invoices.service";
import type { InvoiceSummary, InvoiceStatus } from "@/components/invoices/invoiceData";

// ─── Module mocks ────────────────────────────────────────────────────────────

jest.mock("@/services/client/invoices.service", () => ({
  invoicesService: {
    getInvoiceList: jest.fn(),
  },
}));

jest.mock("next/link", () => {
  const Link = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  Link.displayName = "Link";
  return Link;
});

jest.mock("@/hooks/useDebounce", () => ({
  useDebounce: (value: unknown) => value,
}));

const mockGetInvoiceList = invoicesService.getInvoiceList as jest.MockedFunction<
  typeof invoicesService.getInvoiceList
>;

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeSummary(overrides: Partial<InvoiceSummary> = {}): InvoiceSummary {
  return {
    unique_id: "ABCD1234",
    date: "Jun 1, 2026",
    date_due: "Jun 30, 2026",
    total: "$500.00",
    status: "paid",
    product_types: ["link_building"],
    ...overrides,
  };
}

function makeResponse(items: InvoiceSummary[] = []) {
  return {
    data: items,
    current_page: 1,
    last_page: 1,
    total: items.length,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetInvoiceList.mockResolvedValue(makeResponse([]));
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("InvoicesPage (client) — Stripe-aligned status badges", () => {
  const STATUS_CASES: { status: InvoiceStatus; label: string }[] = [
    { status: "refund", label: "Refund" },
    { status: "partial_refund", label: "Partial Refund" },
    { status: "dispute", label: "Dispute" },
  ];

  it.each(STATUS_CASES)("shows the $label badge for a $status invoice", async ({ status, label }) => {
    mockGetInvoiceList.mockResolvedValue(makeResponse([makeSummary({ status })]));

    render(<InvoicesPage />);

    await waitFor(() => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it("does not surface refunded invoices in the pending payment banner", async () => {
    mockGetInvoiceList.mockResolvedValue(
      makeResponse([makeSummary({ status: "partial_refund" })])
    );

    render(<InvoicesPage />);

    await waitFor(() => {
      expect(screen.getByText("Partial Refund")).toBeInTheDocument();
    });

    // Only unpaid/overdue invoices trigger the awaiting-payment banner.
    expect(screen.queryByText(/awaiting payment/i)).not.toBeInTheDocument();
  });
});
