/**
 * Tests for ActionsDropdown and DeleteOrderDialog on the admin order detail page.
 *
 * The suite verifies:
 *   - the Delete Order action is tucked behind the Actions dropdown, not a
 *     standalone button, and selecting it notifies the parent
 *   - the delete confirmation is gated behind typing the exact order code
 *   - the correct service function is called with the order id
 *   - a successful delete calls onSuccess and redirects to the orders list
 *   - the invoice/multi-product notes only render when applicable
 *   - error state renders correctly
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActionsDropdown, DeleteOrderDialog } from "@/components/admin/orders/OrderActionDialogs";
import { deleteAdminOrder } from "@/services/admin/order.service";
import type { AdminOrder } from "@/types/admin";

// ─── Module mocks ─────────────────────────────────────────────────────────────

jest.mock("@/services/admin/order.service", () => ({
  deleteAdminOrder: jest.fn(),
}));

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockDeleteAdminOrder = deleteAdminOrder as jest.MockedFunction<typeof deleteAdminOrder>;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeOrder(overrides: Partial<AdminOrder> = {}): AdminOrder {
  return {
    id: "12345678-aaaa-bbbb-cccc-1234567890ab",
    user_id: 10,
    order_title: "Link Building Package",
    order_notes: null,
    total_amount: 250,
    status: "processing",
    payment_intent_id: "pi_test_abc",
    created_at: "2026-06-01T10:00:00Z",
    updated_at: "2026-06-01T10:00:00Z",
    user: { id: 10, first_name: "Alice", last_name: "Walker", email: "alice@example.com" },
    items: [],
    billing: null,
    invoice: null,
    session_id: null,
    ...overrides,
  };
}

const noop = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════════
// ActionsDropdown
// ═══════════════════════════════════════════════════════════════════════════════

describe("ActionsDropdown", () => {
  it("renders the Actions trigger without exposing Delete directly", () => {
    render(<ActionsDropdown onSelect={noop} />);
    expect(screen.getByRole("button", { name: "Actions" })).toBeInTheDocument();
    expect(screen.queryByText("Delete Order")).toBeNull();
  });

  it("reveals the Delete Order item when the trigger is clicked", () => {
    render(<ActionsDropdown onSelect={noop} />);
    fireEvent.click(screen.getByRole("button", { name: "Actions" }));
    expect(screen.getByText("Delete Order")).toBeInTheDocument();
  });

  it("calls onSelect with 'delete' and closes the menu when Delete Order is clicked", () => {
    const on_select = jest.fn();
    render(<ActionsDropdown onSelect={on_select} />);

    fireEvent.click(screen.getByRole("button", { name: "Actions" }));
    fireEvent.click(screen.getByText("Delete Order"));

    expect(on_select).toHaveBeenCalledWith("delete");
    expect(screen.queryByText("Delete Order")).toBeNull();
  });

  it("closes the menu when clicking outside", () => {
    render(
      <div>
        <ActionsDropdown onSelect={noop} />
        <button>Outside</button>
      </div>
    );

    fireEvent.click(screen.getByRole("button", { name: "Actions" }));
    expect(screen.getByText("Delete Order")).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole("button", { name: "Outside" }));
    expect(screen.queryByText("Delete Order")).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DeleteOrderDialog
// ═══════════════════════════════════════════════════════════════════════════════

describe("DeleteOrderDialog", () => {
  it("renders with the Delete Order title and order summary", () => {
    render(<DeleteOrderDialog order={makeOrder()} onClose={noop} onSuccess={noop} />);

    expect(screen.getByRole("heading", { name: "Delete Order" })).toBeInTheDocument();
    expect(screen.getByText("Alice Walker")).toBeInTheDocument();
    expect(screen.getByText("Link Building Package")).toBeInTheDocument();
    expect(screen.getByText("$250.00")).toBeInTheDocument();
  });

  it("shows the 8-character order code the admin must type to confirm", () => {
    render(<DeleteOrderDialog order={makeOrder()} onClose={noop} onSuccess={noop} />);
    expect(screen.getByText("12345678")).toBeInTheDocument();
  });

  it("does not show the invoice note when the order has no invoice", () => {
    render(<DeleteOrderDialog order={makeOrder({ invoice: null })} onClose={noop} onSuccess={noop} />);
    expect(screen.queryByText(/unlinked from this order/i)).toBeNull();
  });

  it("shows the invoice note when the order has an invoice attached", () => {
    const order = makeOrder({
      invoice: { id: "inv-1" } as unknown as AdminOrder["invoice"],
    });
    render(<DeleteOrderDialog order={order} onClose={noop} onSuccess={noop} />);
    expect(screen.getByText(/unlinked from this order/i)).toBeInTheDocument();
  });

  it("does not show the multi-product purchase note for a standalone order", () => {
    render(<DeleteOrderDialog order={makeOrder({ session_id: null })} onClose={noop} onSuccess={noop} />);
    expect(screen.queryByText(/multi-product purchase/i)).toBeNull();
  });

  it("shows the multi-product purchase note when the order belongs to a session", () => {
    render(<DeleteOrderDialog order={makeOrder({ session_id: "session-1" })} onClose={noop} onSuccess={noop} />);
    expect(screen.getByText(/multi-product purchase/i)).toBeInTheDocument();
  });

  it("keeps the delete button disabled until the exact order code is typed", async () => {
    render(<DeleteOrderDialog order={makeOrder()} onClose={noop} onSuccess={noop} />);

    const confirm_btn = screen.getByRole("button", { name: "Delete Order" });
    expect(confirm_btn).toBeDisabled();

    const input = screen.getByPlaceholderText("12345678");
    await userEvent.type(input, "wrongcode");
    expect(confirm_btn).toBeDisabled();

    await userEvent.clear(input);
    await userEvent.type(input, "12345678");
    expect(confirm_btn).not.toBeDisabled();
  });

  it("calls deleteAdminOrder with the order id once confirmed", async () => {
    mockDeleteAdminOrder.mockResolvedValueOnce(undefined);
    render(<DeleteOrderDialog order={makeOrder()} onClose={noop} onSuccess={noop} />);

    await userEvent.type(screen.getByPlaceholderText("12345678"), "12345678");
    fireEvent.click(screen.getByRole("button", { name: "Delete Order" }));

    await waitFor(() => {
      expect(mockDeleteAdminOrder).toHaveBeenCalledWith("12345678-aaaa-bbbb-cccc-1234567890ab");
    });
  });

  it("calls onSuccess and redirects to the orders list after a successful delete", async () => {
    mockDeleteAdminOrder.mockResolvedValueOnce(undefined);
    const on_success = jest.fn();
    render(<DeleteOrderDialog order={makeOrder()} onClose={noop} onSuccess={on_success} />);

    await userEvent.type(screen.getByPlaceholderText("12345678"), "12345678");
    fireEvent.click(screen.getByRole("button", { name: "Delete Order" }));

    await waitFor(() => {
      expect(on_success).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/admin/orders");
    });
  });

  it("displays an error banner when the delete service call fails", async () => {
    mockDeleteAdminOrder.mockRejectedValueOnce(new Error("network error"));
    render(<DeleteOrderDialog order={makeOrder()} onClose={noop} onSuccess={noop} />);

    await userEvent.type(screen.getByPlaceholderText("12345678"), "12345678");
    fireEvent.click(screen.getByRole("button", { name: "Delete Order" }));

    await waitFor(() => {
      expect(screen.getByText(/Failed to delete the order/i)).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("calls onClose when Cancel is clicked", () => {
    const on_close = jest.fn();
    render(<DeleteOrderDialog order={makeOrder()} onClose={on_close} onSuccess={noop} />);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(on_close).toHaveBeenCalled();
  });
});
