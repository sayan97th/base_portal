import React from "react";
import { render, screen } from "@testing-library/react";
import PublicOrderSummary from "@/components/order/PublicOrderSummary";
import type { CartItem } from "@/types/client/unified-cart";

// ─── Module mocks ────────────────────────────────────────────────────────────

jest.mock("@/context/CartContext", () => ({
  useCart: jest.fn(),
}));

import { useCart } from "@/context/CartContext";

const mockUseCart = useCart as jest.MockedFunction<typeof useCart>;

function makeCartItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    cart_item_id: "item-1",
    product_type: "link_building",
    tier_id: "dr30",
    tier_name: "DR 30+",
    quantity: 2,
    unit_price: 100,
    ...overrides,
  };
}

function buildCartContext(overrides: Partial<ReturnType<typeof useCart>> = {}): ReturnType<typeof useCart> {
  return {
    items: [],
    applied_coupons: [],
    coupon_input_code: "",
    order_title: "",
    order_notes: "",
    is_cart_ready: true,
    subtotal: 0,
    link_building_subtotal: 0,
    total_links: 0,
    bulk_discount_amount: 0,
    bulk_discount_details: [],
    subtotal_after_bulk: 0,
    total_discount: 0,
    effective_discount_amount: 0,
    active_discount_type: "none",
    total: 0,
    item_count: 0,
    bulk_discount_configs: [],
    coupon_adjustment_notice: null,
    setItemQuantity: jest.fn(),
    updateLinkBuildingKeywords: jest.fn(),
    updateNewContentIntakeData: jest.fn(),
    getIntakeDataForTier: jest.fn().mockReturnValue([]),
    updateContentOptimizationIntakeData: jest.fn(),
    getContentOptimizationIntakeDataForTier: jest.fn().mockReturnValue([]),
    updateContentBriefIntakeData: jest.fn(),
    getContentBriefIntakeDataForTier: jest.fn().mockReturnValue([]),
    clearCart: jest.fn(),
    setAppliedCoupons: jest.fn(),
    setCouponInputCode: jest.fn(),
    setOrderTitle: jest.fn(),
    setOrderNotes: jest.fn(),
    getQuantitiesForProductType: jest.fn().mockReturnValue({}),
    getKeywordDataForTier: jest.fn().mockReturnValue([]),
    setCouponAdjustmentNotice: jest.fn(),
    ...overrides,
  } as ReturnType<typeof useCart>;
}

describe("PublicOrderSummary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows an empty-order message when the cart has no items", () => {
    mockUseCart.mockReturnValue(buildCartContext({ items: [], total: 0 }));
    render(<PublicOrderSummary />);

    expect(screen.getByText("Order Summary")).toBeInTheDocument();
    expect(screen.getByText("Your order is empty.")).toBeInTheDocument();
    expect(screen.getByText("$0.00")).toBeInTheDocument();
  });

  it("renders the tier name, item total, and grand total", () => {
    mockUseCart.mockReturnValue(
      buildCartContext({
        items: [makeCartItem({ tier_name: "DR 40+", unit_price: 130, quantity: 2 })],
        // Distinct from the item's own line total ($260) so the two amounts
        // can be asserted independently without ambiguous text matches.
        total: 235.5,
      })
    );
    render(<PublicOrderSummary />);

    expect(screen.getByText("DR 40+")).toBeInTheDocument();
    expect(screen.getByText("$260.00")).toBeInTheDocument();
    expect(screen.getByText("$235.50")).toBeInTheDocument();
  });

  it("lists numbered keyword / landing page rows for link_building items", () => {
    mockUseCart.mockReturnValue(
      buildCartContext({
        items: [
          makeCartItem({
            keyword_data: [
              { keyword: "best running shoes", landing_page: "https://example.com/shoes", exact_match: false },
              { keyword: "trail running gear", landing_page: "https://example.com/gear", exact_match: true },
            ],
          }),
        ],
        total: 200,
      })
    );
    render(<PublicOrderSummary />);

    expect(screen.getByText("KW: best running shoes")).toBeInTheDocument();
    expect(screen.getByText("Landing page: https://example.com/shoes")).toBeInTheDocument();
    expect(screen.getByText("KW: trail running gear")).toBeInTheDocument();
    expect(screen.getByText("Landing page: https://example.com/gear")).toBeInTheDocument();
  });

  it("falls back to a quantity line when a link_building item has no keyword data yet", () => {
    mockUseCart.mockReturnValue(
      buildCartContext({
        items: [makeCartItem({ quantity: 3, keyword_data: undefined })],
        total: 300,
      })
    );
    render(<PublicOrderSummary />);

    expect(screen.getByText("3 items")).toBeInTheDocument();
  });

  it("uses singular 'item' for a quantity of 1", () => {
    mockUseCart.mockReturnValue(
      buildCartContext({
        items: [makeCartItem({ quantity: 1, keyword_data: undefined })],
        total: 130,
      })
    );
    render(<PublicOrderSummary />);

    expect(screen.getByText("1 item")).toBeInTheDocument();
  });

  it("shows a quantity line (not keyword rows) for non-link_building product types", () => {
    mockUseCart.mockReturnValue(
      buildCartContext({
        items: [
          makeCartItem({
            product_type: "content_optimization",
            tier_id: "co-800",
            tier_name: "800-1,599 Words",
            quantity: 4,
          }),
        ],
        total: 400,
      })
    );
    render(<PublicOrderSummary />);

    expect(screen.getByText("800-1,599 Words")).toBeInTheDocument();
    expect(screen.getByText("4 items")).toBeInTheDocument();
    expect(screen.queryByText(/^KW:/)).not.toBeInTheDocument();
  });

  it("renders every distinct item group when the cart has multiple products", () => {
    mockUseCart.mockReturnValue(
      buildCartContext({
        items: [
          makeCartItem({ cart_item_id: "a", tier_id: "dr30", tier_name: "DR 30+", unit_price: 100, quantity: 1 }),
          makeCartItem({
            cart_item_id: "b",
            product_type: "new_content",
            tier_id: "nc-500",
            tier_name: "500 Words",
            unit_price: 80,
            quantity: 2,
          }),
        ],
        total: 260,
      })
    );
    render(<PublicOrderSummary />);

    expect(screen.getByText("DR 30+")).toBeInTheDocument();
    expect(screen.getByText("500 Words")).toBeInTheDocument();
  });
});
