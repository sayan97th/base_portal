/**
 * The read only "Original Order" view opens from the Orders list and from the
 * order detail page, for Link Building orders only: the other products do not
 * keep an original copy.
 */

import React from "react";
import { render, screen, within } from "@testing-library/react";
import AdminOrdersContent from "@/components/admin/orders/AdminOrdersContent";
import AdminOrderDetailContent from "@/components/admin/orders/AdminOrderDetailContent";
import type { AdminOrder, AdminOrderProductType } from "@/types/admin";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

// The date range pickers of the filters bar are not part of these tests.
jest.mock("flatpickr", () => ({
  __esModule: true,
  default: jest.fn(() => ({ destroy: jest.fn(), setDate: jest.fn(), set: jest.fn(), clear: jest.fn() })),
}));

jest.mock("@/services/admin/order.service", () => ({
  listAdminOrders: jest.fn(),
  getAdminOrder: jest.fn(),
}));

jest.mock("@/components/admin/orders/AdminOrderComments", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/admin/orders/OrderTrackingPanel", () => ({ __esModule: true, default: () => null }));

import { getAdminOrder, listAdminOrders } from "@/services/admin/order.service";

const mockListAdminOrders = listAdminOrders as jest.MockedFunction<typeof listAdminOrders>;
const mockGetAdminOrder = getAdminOrder as jest.MockedFunction<typeof getAdminOrder>;

function makeOrder(id: string, product_type: AdminOrderProductType, title: string): AdminOrder {
  return {
    id,
    user_id: 3,
    order_title: title,
    order_notes: null,
    subtotal_before_discount: 100,
    total_amount: 100,
    status: "processing",
    payment_intent_id: "pi_1",
    created_at: "2026-10-15T15:00:00+00:00",
    updated_at: "2026-10-15T15:00:00+00:00",
    user: { id: 3, first_name: "Weave", last_name: "Buyer", email: "buyer@getweave.com" },
    items: [],
    billing: null,
    invoice: null,
    coupons: [],
    session_id: null,
    session_title: null,
    product_type,
  } as AdminOrder;
}

beforeEach(() => jest.clearAllMocks());

describe("Orders list", () => {
  it("offers the original order on Link Building orders only", async () => {
    mockListAdminOrders.mockResolvedValue({
      data: [
        makeOrder("lb-order-id", "link_building", "Weave links"),
        makeOrder("nc-order-id", "new_content", "Weave blog posts"),
      ],
      current_page: 1,
      last_page: 1,
      total: 2,
    });

    render(<AdminOrdersContent />);
    await screen.findByText("Weave links");

    const links = screen.getAllByRole("link", { name: /Original Order/ });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "/admin/orders/lb-order-id/original");
  });
});

describe("Order detail page", () => {
  it("offers the original order of a Link Building order", async () => {
    mockGetAdminOrder.mockResolvedValue(makeOrder("lb-order-id", "link_building", "Weave links"));

    render(<AdminOrderDetailContent order_id="lb-order-id" />);
    const heading = await screen.findByRole("heading", { level: 1, name: "Weave links" });

    const header = heading.closest("div.flex.flex-wrap.items-start") as HTMLElement;
    expect(within(header).getByRole("link", { name: /Original Order/ })).toHaveAttribute("href", "/admin/orders/lb-order-id/original");
  });

  it("does not offer it for other products", async () => {
    mockGetAdminOrder.mockResolvedValue(makeOrder("nc-order-id", "new_content", "Weave blog posts"));

    render(<AdminOrderDetailContent order_id="nc-order-id" />);
    await screen.findByRole("heading", { level: 1, name: "Weave blog posts" });

    expect(screen.queryByRole("link", { name: /Original Order/ })).not.toBeInTheDocument();
  });
});
