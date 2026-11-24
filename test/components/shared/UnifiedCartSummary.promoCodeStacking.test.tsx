/**
 * Promotions do not stack by default in the checkout Order Summary
 * (UnifiedCartSummary).
 *
 * When a promo code replaces a bulk discount the client qualifies for, the
 * summary explains why the discount is gone. When the admin allowed combining
 * them, the bulk discount is shown next to the promo code.
 */

import React from "react";
import { render, screen, within } from "@testing-library/react";
import UnifiedCartSummary from "@/components/shared/UnifiedCartSummary";
import type { CartItem } from "@/types/client/unified-cart";
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

jest.mock("@/services/client/coupons.service", () => ({
  validateCoupon: jest.fn(),
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

function mockCart(overrides: Partial<ReturnType<typeof useCart>>) {
  mock_use_cart.mockReturnValue({
    items: ten_links,
    applied_coupons: [],
    coupon_input_code: "",
    subtotal: 4000,
    bulk_discount_amount: 0,
    bulk_discount_details: [] as BulkDiscountDetail[],
    total_discount: 0,
    effective_discount_amount: 0,
    active_discount_type: "none",
    total: 4000,
    coupon_adjustment_notice: null,
    gift_card_reward_coupon: null,
    gift_card_reward_amount: 0,
    gift_card_reward_details: { recipient_email: "", gift_card_brand: "" },
    setItemQuantity: jest.fn(),
    setAppliedCoupons: jest.fn(),
    setCouponInputCode: jest.fn(),
    setCouponAdjustmentNotice: jest.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useCart>);
}

const replaced_notice = /Promotions cannot be combined/i;

describe("UnifiedCartSummary promo code stacking", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("promo code replaced the bulk discount", () => {
    it("explains that the promo code replaced the bulk discount and how to get it back", () => {
      mockCart({
        applied_coupons: [makeRewardCoupon()],
        bulk_discount_details: [makeReplacedDetail(400)],
      });

      render(<UnifiedCartSummary />);

      expect(screen.getByRole("status")).toHaveTextContent(
        "Promotions cannot be combined. Your promo code replaces the 10% bulk discount ($400.00) on this order. Remove the promo code to get the bulk discount back."
      );
    });

    it("does not show the replaced discount as applied anywhere", () => {
      mockCart({
        applied_coupons: [makeRewardCoupon()],
        bulk_discount_details: [makeReplacedDetail(400)],
      });

      render(<UnifiedCartSummary />);

      expect(screen.queryByText(/bulk discount applied/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Bulk Discount \(/)).not.toBeInTheDocument();
      expect(screen.queryByText("Subtotal")).not.toBeInTheDocument();
      expect(screen.queryByText(/to unlock/i)).not.toBeInTheDocument();
    });

    it("lists every replaced discount and adds up their savings", () => {
      mockCart({
        applied_coupons: [makeRewardCoupon()],
        bulk_discount_details: [
          makeReplacedDetail(400),
          makeReplacedDetail(50, {
            config: makeBulkDiscount({ id: "bulk-nc", applies_to: "new_content", discount_rate: 20 }),
          }),
        ],
      });

      render(<UnifiedCartSummary />);

      expect(screen.getByRole("status")).toHaveTextContent(
        "replaces the 10% bulk discount and 20% bulk discount ($450.00) on this order."
      );
    });

    it("explains it for price discount promo codes too", () => {
      mockCart({
        applied_coupons: [makePercentageCoupon()],
        total_discount: 200,
        effective_discount_amount: 200,
        active_discount_type: "coupon",
        total: 3800,
        bulk_discount_details: [makeReplacedDetail(400)],
      });

      render(<UnifiedCartSummary />);

      expect(screen.getByRole("status")).toHaveTextContent(replaced_notice);
      expect(screen.queryByText(/Bulk Discount \(/)).not.toBeInTheDocument();
    });

    it("leaves the explanation to the promo code notice when one is already shown", () => {
      mockCart({
        applied_coupons: [makePercentageCoupon()],
        active_discount_type: "coupon",
        bulk_discount_details: [makeReplacedDetail(400)],
        coupon_adjustment_notice: 'Promo code "SAVE5" applied. It replaces the bulk discount ($400.00) with this promo ($200.00).',
      });

      render(<UnifiedCartSummary />);

      expect(screen.queryByText(replaced_notice)).not.toBeInTheDocument();
      expect(screen.getByText(/It replaces the bulk discount/)).toBeInTheDocument();
    });

    it("does not explain anything when paying with credits", () => {
      mockCart({
        applied_coupons: [makeRewardCoupon()],
        bulk_discount_details: [makeReplacedDetail(400)],
      });

      render(<UnifiedCartSummary is_applying_credits credits_to_apply={4000} />);

      expect(screen.queryByText(replaced_notice)).not.toBeInTheDocument();
    });

    it("hides the unlock teaser while a promo code would replace the discount", () => {
      mockCart({
        items: [{ ...ten_links[0], quantity: 5 }],
        applied_coupons: [makeRewardCoupon()],
        bulk_discount_details: [
          makeReplacedDetail(0, { is_eligible: false, current_quantity: 5, quantity_needed: 5 }),
        ],
      });

      render(<UnifiedCartSummary />);

      expect(screen.queryByText(/to unlock/i)).not.toBeInTheDocument();
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });
  });

  describe("without a promo code", () => {
    it("shows the bulk discount and no stacking explanation", () => {
      mockCart({
        bulk_discount_amount: 400,
        effective_discount_amount: 400,
        active_discount_type: "bulk",
        total: 3600,
        bulk_discount_details: [makeAppliedDetail(400)],
      });

      render(<UnifiedCartSummary />);

      expect(screen.getByText(/10% bulk discount applied/i)).toBeInTheDocument();
      expect(screen.queryByText(replaced_notice)).not.toBeInTheDocument();
    });

    it("still shows the unlock teaser below the minimum quantity", () => {
      mockCart({
        items: [{ ...ten_links[0], quantity: 5 }],
        bulk_discount_details: [
          {
            ...makeAppliedDetail(0),
            is_eligible: false,
            is_applied: false,
            current_quantity: 5,
            quantity_needed: 5,
          },
        ],
      });

      render(<UnifiedCartSummary />);

      expect(screen.getByText(/to unlock/i)).toBeInTheDocument();
    });
  });

  describe("combining allowed by the admin", () => {
    it("shows the bulk discount and the price discount promo code together", () => {
      mockCart({
        applied_coupons: [makePercentageCoupon()],
        bulk_discount_amount: 400,
        total_discount: 200,
        effective_discount_amount: 600,
        active_discount_type: "combined",
        total: 3400,
        bulk_discount_details: [
          makeAppliedDetail(400, { config: makeBulkDiscount({ allow_promo_code_stacking: true }) }),
        ],
      });

      const { container } = render(<UnifiedCartSummary />);

      const bulk_row = screen.getByText(/Bulk Discount \(10% off/i).parentElement as HTMLElement;
      expect(within(bulk_row).getByText(/400\.00/)).toBeInTheDocument();
      expect(container).toHaveTextContent("200.00");
      expect(container).toHaveTextContent("3,400.00");
      expect(container).not.toHaveTextContent(replaced_notice);
    });

    it("keeps showing the unlock teaser next to a promo code below the minimum", () => {
      mockCart({
        items: [{ ...ten_links[0], quantity: 5 }],
        applied_coupons: [makePercentageCoupon()],
        active_discount_type: "coupon",
        bulk_discount_details: [
          {
            ...makeAppliedDetail(0, { config: makeBulkDiscount({ allow_promo_code_stacking: true }) }),
            is_eligible: false,
            is_applied: false,
            current_quantity: 5,
            quantity_needed: 5,
          },
        ],
      });

      render(<UnifiedCartSummary />);

      expect(screen.getByText(/to unlock/i)).toBeInTheDocument();
    });

    it("shows the bulk discount row and badge next to the money back promo code", () => {
      mockCart({
        applied_coupons: [makeRewardCoupon()],
        bulk_discount_amount: 400,
        effective_discount_amount: 400,
        active_discount_type: "bulk",
        total: 3600,
        bulk_discount_details: [
          makeAppliedDetail(400, { config: makeBulkDiscount({ allow_promo_code_stacking: true }) }),
        ],
      });

      const { container } = render(<UnifiedCartSummary />);

      expect(screen.getByText(/10% bulk discount applied/i)).toBeInTheDocument();
      const bulk_row = screen.getByText(/Bulk Discount \(10% off/i).parentElement as HTMLElement;
      expect(within(bulk_row).getByText(/400\.00/)).toBeInTheDocument();
      expect(screen.getByText("Subtotal")).toBeInTheDocument();
      expect(container).not.toHaveTextContent(replaced_notice);
    });
  });
});
