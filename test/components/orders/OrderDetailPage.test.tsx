import React from "react";
import { render, waitFor } from "@testing-library/react";
import OrderDetailPage from "@/components/orders/OrderDetailPage";
import { fetchOrderByUuid } from "@/services/client/order-detail.service";
import type { LinkBuildingOrderDetail } from "@/types/client/link-building";

jest.mock("@/services/client/order-detail.service", () => ({
  fetchOrderByUuid: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/components/orders/OrderComments", () => function OrderCommentsMock() {
  return null;
});

jest.mock("@/components/orders/OrderProgressTimeline", () => function OrderProgressTimelineMock() {
  return null;
});

const mocked_fetch_order = fetchOrderByUuid as jest.Mock;

function buildLinkBuildingOrder(
  overrides: Partial<LinkBuildingOrderDetail> = {}
): LinkBuildingOrderDetail {
  return {
    id: "order-1",
    order_title: "Sample Link Building Order",
    order_notes: null,
    subtotal_before_discount: 100,
    total_amount: 100,
    status: "completed",
    payment_intent_id: null,
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-27T00:00:00Z",
    items: [],
    billing: {
      id: "billing-1",
      address: "123 Main St",
      city: "Austin",
      state: "TX",
      country: "US",
      postal_code: "78701",
    },
    coupons: [],
    discounts: [],
    ...overrides,
  };
}

describe("OrderDetailPage #live-links deep link", () => {
  const original_hash = window.location.hash;

  beforeEach(() => {
    jest.clearAllMocks();
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
    window.location.hash = "";
  });

  afterAll(() => {
    window.location.hash = original_hash;
  });

  it("scrolls to the live links section once a completed order finishes loading", async () => {
    window.location.hash = "#live-links";
    mocked_fetch_order.mockResolvedValue({
      product_type: "link_building",
      data: buildLinkBuildingOrder(),
    });

    render(<OrderDetailPage order_id="order-1" />);

    await waitFor(() => {
      expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
    });
  });

  it("does not scroll when the hash does not target the live links section", async () => {
    window.location.hash = "";
    mocked_fetch_order.mockResolvedValue({
      product_type: "link_building",
      data: buildLinkBuildingOrder(),
    });

    render(<OrderDetailPage order_id="order-1" />);

    await waitFor(() => {
      expect(mocked_fetch_order).toHaveBeenCalled();
    });

    expect(window.HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
  });
});
