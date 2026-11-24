/**
 * Promotions do not stack by default in the order review step (OrderReviewStep).
 *
 * The Price Summary only lists the bulk discount when it really lowers the
 * total, so a discount replaced by a promo code never shows up next to it.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import OrderReviewStep from "@/components/shared/OrderReviewStep";
import type { CartAppliedCoupon, CartItem } from "@/types/client/unified-cart";
import type { BulkDiscountDetail } from "@/types/admin/discounts";
import {
  makeAppliedDetail,
  makeBulkDiscount,
  makePercentageCoupon,
  makeReplacedDetail,
  makeRewardCoupon,
} from "../../utils/promo-code-stacking-fixtures";

jest.mock("@/context/CartContext", () => ({
  useCart: jest.fn(),
}));

import { useCart } from "@/context/CartContext";

const mock_use_cart = useCart as jest.MockedFunction<typeof useCart>;

const ten_links: CartItem[] = [
  {
    cart_item_id: "lb-1",
    product_type: "link_building",
    tier_id: "dr50",
    tier_name: "DR 50+",
    quantity: 10,
    unit_price: 400,
  } as CartItem,
];

function mockCart(overrides: {
  applied_coupons?: CartAppliedCoupon[];
  bulk_discount_details?: BulkDiscountDetail[];
  bulk_discount_amount?: number;
  total_discount?: number;
  total?: number;
}) {
  mock_use_cart.mockReturnValue({
    items: ten_links,
    order_title: "",
    order_notes: "",
    subtotal: 4000,
    bulk_discount_amount: 0,
    bulk_discount_details: [],
    total_discount: 0,
    total: 4000,
    applied_coupons: [],
    getKeywordDataForTier: jest.fn().mockReturnValue([]),
    getIntakeDataForTier: jest.fn().mockReturnValue([]),
    getContentOptimizationIntakeDataForTier: jest.fn().mockReturnValue([]),
    getContentBriefIntakeDataForTier: jest.fn().mockReturnValue([]),
    ...overrides,
  } as unknown as ReturnType<typeof useCart>);
}

function renderStep() {
  render(<OrderReviewStep onBack={jest.fn()} onNext={jest.fn()} />);
}

describe("OrderReviewStep promo code stacking", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does not list a bulk discount replaced by a money back promo code", () => {
    mockCart({
      applied_coupons: [makeRewardCoupon()],
      bulk_discount_details: [makeReplacedDetail(400)],
    });

    renderStep();

    expect(screen.queryByText(/Bulk Discount \(/)).not.toBeInTheDocument();
    expect(screen.getByText("$4,000.00")).toBeInTheDocument();
  });

  it("lists only the promo code when a price discount promo code replaced the bulk discount", () => {
    mockCart({
      applied_coupons: [makePercentageCoupon()],
      total_discount: 200,
      total: 3800,
      bulk_discount_details: [makeReplacedDetail(400)],
    });

    renderStep();

    expect(screen.queryByText(/Bulk Discount \(/)).not.toBeInTheDocument();
    expect(screen.getByText("Save 5%")).toBeInTheDocument();
    expect(screen.getByText("$3,800.00")).toBeInTheDocument();
  });

  it("lists the bulk discount and the price discount promo code together when combining is allowed", () => {
    mockCart({
      applied_coupons: [makePercentageCoupon()],
      bulk_discount_amount: 400,
      total_discount: 200,
      total: 3400,
      bulk_discount_details: [
        makeAppliedDetail(400, { config: makeBulkDiscount({ allow_promo_code_stacking: true }) }),
      ],
    });

    renderStep();

    expect(screen.getByText(/Bulk Discount \(10% off links\)/)).toBeInTheDocument();
    expect(screen.getByText("Save 5%")).toBeInTheDocument();
    expect(screen.getByText("$3,400.00")).toBeInTheDocument();
  });

  it("lists the bulk discount next to the money back promo code when stacking is allowed", () => {
    mockCart({
      applied_coupons: [makeRewardCoupon()],
      bulk_discount_amount: 400,
      total: 3600,
      bulk_discount_details: [
        makeAppliedDetail(400, { config: makeBulkDiscount({ allow_promo_code_stacking: true }) }),
      ],
    });

    renderStep();

    expect(screen.getByText(/Bulk Discount \(10% off links\)/)).toBeInTheDocument();
    expect(screen.getByText("$3,600.00")).toBeInTheDocument();
  });
});
