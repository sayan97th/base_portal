/**
 * Tests for the admin Transactions view
 * (src/components/admin/transactions/AdminTransactionsContent.tsx).
 *
 * Focused on the SEO subscription payments that must always be listed here:
 * card renewals and manual charges, declined attempts with their reason, and
 * months recorded as paid outside the portal ("Manual Payment").
 */

import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import AdminTransactionsContent from "@/components/admin/transactions/AdminTransactionsContent";
import type { AdminTransaction } from "@/types/admin";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

jest.mock("@/services/admin/transactions.service", () => ({
  listAdminTransactions: jest.fn(),
}));

import { listAdminTransactions } from "@/services/admin/transactions.service";

const mock_list = listAdminTransactions as jest.MockedFunction<typeof listAdminTransactions>;

const USER = { id: 4, first_name: "Cathleen", last_name: "Siech", email: "cathleen@example.com" };

function makeTransaction(overrides: Partial<AdminTransaction> = {}): AdminTransaction {
  return {
    id: 1,
    type: "purchase",
    status: "success",
    amount: 2000,
    payment_method: "credit_card",
    payment_intent_id: "pi_3QxYzAbCdEfGhIjK",
    session_id: null,
    session_title: null,
    order_id: null,
    invoice_id: "51",
    description: "SEO subscription November 2026, invoice 1042 paid with card on file (Visa ending in 4242).",
    error_message: null,
    metadata: { seo_subscription_id: "7", charge_trigger: "automatic" },
    created_at: "2026-11-22T15:05:00Z",
    updated_at: "2026-11-22T15:05:00Z",
    user: USER,
    ...overrides,
  };
}

const CARD_RENEWAL = makeTransaction();
const DECLINED_RENEWAL = makeTransaction({
  id: 2,
  type: "failed_purchase",
  status: "failed",
  invoice_id: "52",
  payment_intent_id: "pi_3QxDeclinedAttempt",
  description: "SEO subscription auto renewal for December 2026 declined on card on file (Visa ending in 4242), attempt 1.",
  error_message: "Your card has insufficient funds.",
});
const PAID_OUTSIDE = makeTransaction({
  id: 3,
  payment_method: "manual",
  payment_intent_id: null,
  invoice_id: "53",
  description: "SEO subscription October 2026, invoice 1040 paid outside the portal. Reference: Bank transfer 8812.",
  metadata: { seo_subscription_id: "7", charge_trigger: "external", reference: "Bank transfer 8812" },
});

function respondWith(rows: AdminTransaction[]) {
  mock_list.mockResolvedValue({ data: rows, current_page: 1, last_page: 1, total: rows.length } as never);
}

function rowOf(invoice_id: string) {
  return screen.getByRole("link", { name: `Invoice #${invoice_id}` }).closest("tr") as HTMLElement;
}

beforeEach(() => {
  jest.clearAllMocks();
  respondWith([CARD_RENEWAL, DECLINED_RENEWAL, PAID_OUTSIDE]);
});

describe("AdminTransactionsContent", () => {
  it("lists every subscription payment, paid or declined", async () => {
    render(<AdminTransactionsContent />);

    expect(await screen.findByRole("link", { name: "Invoice #51" })).toHaveAttribute("href", "/admin/invoices/51");
    expect(screen.getByRole("link", { name: "Invoice #52" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Invoice #53" })).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("shows a card renewal as a successful credit card purchase", async () => {
    render(<AdminTransactionsContent />);
    await screen.findByRole("link", { name: "Invoice #51" });

    const row = rowOf("51");
    expect(within(row).getByText("Purchase")).toBeInTheDocument();
    expect(within(row).getByText("success")).toBeInTheDocument();
    expect(within(row).getByText("Credit Card")).toBeInTheDocument();
  });

  it("shows a declined attempt as a failed purchase with the decline reason", async () => {
    render(<AdminTransactionsContent />);
    await screen.findByRole("link", { name: "Invoice #52" });

    const row = rowOf("52");
    expect(within(row).getByText("Failed Purchase")).toBeInTheDocument();
    expect(within(row).getByText("failed")).toBeInTheDocument();
    expect(within(row).getByText("Your card has insufficient funds.")).toBeInTheDocument();
  });

  it("labels a month paid outside the portal as a manual payment", async () => {
    render(<AdminTransactionsContent />);
    await screen.findByRole("link", { name: "Invoice #53" });

    const row = rowOf("53");
    expect(within(row).getByText("Manual Payment")).toBeInTheDocument();
    expect(within(row).getByText("Purchase")).toBeInTheDocument();
  });

  it("falls back to the raw method name for a method this page does not know yet", async () => {
    respondWith([makeTransaction({ payment_method: "wire_transfer" as never })]);
    render(<AdminTransactionsContent />);
    await screen.findByRole("link", { name: "Invoice #51" });

    expect(within(rowOf("51")).getByText("wire_transfer")).toBeInTheDocument();
  });

  it("filters by manual payments", async () => {
    render(<AdminTransactionsContent />);
    await screen.findByRole("link", { name: "Invoice #51" });

    const method_select = screen.getByDisplayValue("All Methods");
    expect(within(method_select).getByRole("option", { name: "Manual Payment" })).toHaveValue("manual");

    fireEvent.change(method_select, { target: { value: "manual" } });

    await waitFor(() =>
      expect(mock_list).toHaveBeenLastCalledWith(expect.objectContaining({ payment_method: "manual", page: 1 }))
    );
  });

  it("filters failed attempts", async () => {
    render(<AdminTransactionsContent />);
    await screen.findByRole("link", { name: "Invoice #51" });

    fireEvent.change(screen.getByDisplayValue("All Types"), { target: { value: "failed_purchase" } });

    await waitFor(() =>
      expect(mock_list).toHaveBeenLastCalledWith(expect.objectContaining({ type: "failed_purchase" }))
    );
  });

  it("shows an error when transactions cannot be loaded", async () => {
    mock_list.mockRejectedValue(new Error("Network error"));
    render(<AdminTransactionsContent />);

    expect(await screen.findByText("Failed to load transactions. Please try again.")).toBeInTheDocument();
  });
});
