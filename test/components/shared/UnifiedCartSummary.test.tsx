import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UnifiedCartSummary from "@/components/shared/UnifiedCartSummary";
import { validateCoupon } from "@/services/client/coupons.service";
import type { CartItem, CartAppliedCoupon } from "@/types/client/unified-cart";

// ─── Module mocks ────────────────────────────────────────────────────────────

jest.mock("@/context/CartContext", () => ({
  useCart: jest.fn(),
}));

jest.mock("@/services/client/coupons.service", () => ({
  validateCoupon: jest.fn(),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

import { useCart } from "@/context/CartContext";

const mockUseCart = useCart as jest.MockedFunction<typeof useCart>;
const mockValidateCoupon = validateCoupon as jest.MockedFunction<typeof validateCoupon>;

function makeCartItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    cart_item_id:  "item-1",
    product_type:  "link_building",
    tier_id:       "dr30",
    tier_name:     "DR 30+",
    quantity:      2,
    unit_price:    100.0,
    ...overrides,
  };
}

function buildCartContext(overrides: Partial<ReturnType<typeof useCart>> = {}): ReturnType<typeof useCart> {
  return {
    items:                         [],
    applied_coupons:               [],
    coupon_input_code:             "",
    order_title:                   "",
    order_notes:                   "",
    is_cart_ready:                 true,
    subtotal:                      0,
    link_building_subtotal:        0,
    total_links:                   0,
    bulk_discount_amount:          0,
    bulk_discount_details:         [],
    subtotal_after_bulk:           0,
    total_discount:                0,
    effective_discount_amount:     0,
    active_discount_type:          "none",
    total:                         0,
    item_count:                    0,
    bulk_discount_configs:         [],
    coupon_adjustment_notice:      null,
    setItemQuantity:               jest.fn(),
    updateLinkBuildingKeywords:    jest.fn(),
    updateNewContentIntakeData:    jest.fn(),
    getIntakeDataForTier:          jest.fn().mockReturnValue([]),
    updateContentOptimizationIntakeData:    jest.fn(),
    getContentOptimizationIntakeDataForTier: jest.fn().mockReturnValue([]),
    updateContentBriefIntakeData:           jest.fn(),
    getContentBriefIntakeDataForTier:       jest.fn().mockReturnValue([]),
    clearCart:                     jest.fn(),
    setAppliedCoupons:             jest.fn(),
    setCouponInputCode:            jest.fn(),
    setOrderTitle:                 jest.fn(),
    setOrderNotes:                 jest.fn(),
    getQuantitiesForProductType:   jest.fn().mockReturnValue({}),
    getKeywordDataForTier:         jest.fn().mockReturnValue([]),
    setCouponAdjustmentNotice:     jest.fn(),
    ...overrides,
  } as ReturnType<typeof useCart>;
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe("UnifiedCartSummary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCart.mockReturnValue(buildCartContext());
  });

  // ─── Render with empty cart ─────────────────────────────────────────────

  describe("empty cart", () => {
    it("renders Order Summary heading", () => {
      render(<UnifiedCartSummary />);

      expect(screen.getByText("Order Summary")).toBeInTheDocument();
    });

    it("shows no items message when cart is empty", () => {
      render(<UnifiedCartSummary />);

      expect(screen.getByText(/no items selected yet/i)).toBeInTheDocument();
    });

    it("renders the action button with default label", () => {
      render(<UnifiedCartSummary onAction={jest.fn()} />);

      expect(screen.getByRole("button", { name: /continue/i })).toBeInTheDocument();
    });

    it("renders custom action label", () => {
      render(<UnifiedCartSummary action_label="Next Step" onAction={jest.fn()} />);

      expect(screen.getByRole("button", { name: /next step/i })).toBeInTheDocument();
    });

    it("displays $0.00 total when cart is empty", () => {
      render(<UnifiedCartSummary />);

      expect(screen.getByText("$0.00")).toBeInTheDocument();
    });
  });

  // ─── Cart with items ────────────────────────────────────────────────────

  describe("cart with items", () => {
    it("renders item name and price", () => {
      mockUseCart.mockReturnValue(
        buildCartContext({
          items:    [makeCartItem({ tier_name: "DR 30+", quantity: 2, unit_price: 100 })],
          subtotal: 200,
          total:    200,
        })
      );

      render(<UnifiedCartSummary />);

      expect(screen.getByText("DR 30+")).toBeInTheDocument();
      // $200.00 appears as both item subtotal and cart total — both are valid
      const price_els = screen.getAllByText("$200.00");
      expect(price_els.length).toBeGreaterThanOrEqual(1);
    });

    it("renders correct product type label for link_building", () => {
      mockUseCart.mockReturnValue(
        buildCartContext({
          items: [makeCartItem({ product_type: "link_building" })],
        })
      );

      render(<UnifiedCartSummary />);

      expect(screen.getByText("Link Building")).toBeInTheDocument();
    });

    it("renders item quantity in the counter", () => {
      mockUseCart.mockReturnValue(
        buildCartContext({
          items: [makeCartItem({ quantity: 5 })],
        })
      );

      render(<UnifiedCartSummary />);

      expect(screen.getByText("5")).toBeInTheDocument();
    });

    it("calls setItemQuantity when increase button is clicked", () => {
      const mockSetItemQuantity = jest.fn();
      mockUseCart.mockReturnValue(
        buildCartContext({
          items:           [makeCartItem({ quantity: 2 })],
          setItemQuantity: mockSetItemQuantity,
        })
      );

      render(<UnifiedCartSummary />);

      const increase_btn = screen.getByRole("button", { name: /increase/i });
      fireEvent.click(increase_btn);

      expect(mockSetItemQuantity).toHaveBeenCalledWith(
        "link_building", "dr30", "DR 30+", 100, 3
      );
    });

    it("calls setItemQuantity when decrease button is clicked", () => {
      const mockSetItemQuantity = jest.fn();
      mockUseCart.mockReturnValue(
        buildCartContext({
          items:           [makeCartItem({ quantity: 3 })],
          setItemQuantity: mockSetItemQuantity,
        })
      );

      render(<UnifiedCartSummary />);

      const decrease_btn = screen.getByRole("button", { name: /decrease/i });
      fireEvent.click(decrease_btn);

      expect(mockSetItemQuantity).toHaveBeenCalledWith(
        "link_building", "dr30", "DR 30+", 100, 2
      );
    });

    it("quantity buttons are disabled when is_quantity_locked is true", () => {
      mockUseCart.mockReturnValue(
        buildCartContext({ items: [makeCartItem({ quantity: 2 })] })
      );

      render(<UnifiedCartSummary is_quantity_locked />);

      const decrease_btn = screen.getByRole("button", { name: /decrease/i });
      const increase_btn = screen.getByRole("button", { name: /increase/i });

      expect(decrease_btn).toBeDisabled();
      expect(increase_btn).toBeDisabled();
    });
  });

  // ─── Bulk discount ──────────────────────────────────────────────────────

  describe("bulk discount", () => {
    it("shows subtotal and bulk discount when applied", () => {
      mockUseCart.mockReturnValue(
        buildCartContext({
          items: [makeCartItem({ quantity: 10, unit_price: 100 })],
          subtotal:                  1000,
          bulk_discount_amount:      100,
          effective_discount_amount: 100,
          active_discount_type:      "bulk",
          total:                     900,
          bulk_discount_details: [
            {
              config: {
                id:            "bd1",
                applies_to:    "link_building",
                discount_rate: 10,
                min_quantity:  10,
              },
              is_applied:       true,
              quantity_needed:  0,
              discount_amount:  100,
            },
          ],
        })
      );

      render(<UnifiedCartSummary />);

      expect(screen.getByText("Subtotal")).toBeInTheDocument();
      expect(screen.getByText(/10% bulk discount applied/i)).toBeInTheDocument();
    });

    it("shows teaser when bulk discount threshold is not yet met", () => {
      mockUseCart.mockReturnValue(
        buildCartContext({
          items: [makeCartItem({ quantity: 5 })],
          bulk_discount_details: [
            {
              config: {
                id:            "bd1",
                applies_to:    "link_building",
                discount_rate: 10,
                min_quantity:  10,
              },
              is_applied:      false,
              quantity_needed: 5,
              discount_amount: 0,
            },
          ],
        })
      );

      render(<UnifiedCartSummary />);

      expect(screen.getByText(/add/i)).toBeInTheDocument();
      expect(screen.getByText(/10% off/i)).toBeInTheDocument();
    });
  });

  // ─── Coupon section ─────────────────────────────────────────────────────

  describe("coupon section", () => {
    it("coupon field is not shown when show_coupon_field is false", () => {
      render(<UnifiedCartSummary show_coupon_field={false} />);

      expect(screen.queryByPlaceholderText(/promo code/i)).not.toBeInTheDocument();
    });

    it("coupon field is shown when show_coupon_field is true", () => {
      mockUseCart.mockReturnValue(
        buildCartContext({ subtotal: 600 })
      );

      render(<UnifiedCartSummary show_coupon_field />);

      expect(screen.getByPlaceholderText("PROMO CODE")).toBeInTheDocument();
    });

    it("applies a valid coupon and updates state", async () => {
      const mockSetAppliedCoupons = jest.fn();
      const mockSetCouponInputCode = jest.fn();

      mockUseCart.mockReturnValue(
        buildCartContext({
          subtotal:             600,
          coupon_input_code:    "SAVE10",
          setAppliedCoupons:    mockSetAppliedCoupons,
          setCouponInputCode:   mockSetCouponInputCode,
        })
      );

      mockValidateCoupon.mockResolvedValue({
        valid:                    true,
        coupon_id:                "coupon-uuid",
        code:                     "SAVE10",
        name:                     "Save 10%",
        discount_type:            "percentage",
        discount_value:           10,
        applies_to:               "all",
        product_types:            [],
        dr_tier_id:               null,
        minimum_purchase_amount:  null,
        discount_amount:          60,
        message:                  "",
      });

      render(<UnifiedCartSummary show_coupon_field />);

      const apply_btn = screen.getByRole("button", { name: /add/i });
      fireEvent.click(apply_btn);

      await waitFor(() => {
        expect(mockValidateCoupon).toHaveBeenCalled();
        expect(mockSetAppliedCoupons).toHaveBeenCalled();
      });
    });

    it("shows error message when coupon is invalid", async () => {
      mockUseCart.mockReturnValue(
        buildCartContext({
          subtotal:          600,
          coupon_input_code: "BADCODE",
        })
      );

      mockValidateCoupon.mockResolvedValue({
        valid:                    false,
        coupon_id:                "",
        code:                     "BADCODE",
        name:                     "",
        discount_type:            "percentage",
        discount_value:           0,
        applies_to:               "all",
        product_types:            [],
        dr_tier_id:               null,
        minimum_purchase_amount:  null,
        discount_amount:          0,
        message:                  "Invalid promo code.",
      });

      render(<UnifiedCartSummary show_coupon_field />);

      const apply_btn = screen.getByRole("button", { name: /add/i });
      fireEvent.click(apply_btn);

      await waitFor(() => {
        expect(screen.getByText("Invalid promo code.")).toBeInTheDocument();
      });
    });

    it("shows minimum cart warning when subtotal is below $500", () => {
      mockUseCart.mockReturnValue(
        buildCartContext({
          subtotal:          300,
          coupon_input_code: "CODE",
        })
      );

      render(<UnifiedCartSummary show_coupon_field />);

      expect(screen.getByText(/minimum cart total/i)).toBeInTheDocument();
    });

    it("shows applied coupon chip with remove button", () => {
      const applied: CartAppliedCoupon = {
        coupon_id:       "uuid-1",
        code:            "SAVE20",
        coupon_name:     "Save 20%",
        discount_amount: 120,
        discount_type:   "percentage",
        discount_value:  20,
      };

      mockUseCart.mockReturnValue(
        buildCartContext({
          subtotal:         600,
          applied_coupons:  [applied],
        })
      );

      render(<UnifiedCartSummary show_coupon_field />);

      expect(screen.getByText("Save 20%")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /remove coupon SAVE20/i })).toBeInTheDocument();
    });

    it("removes applied coupon when remove button is clicked", () => {
      const mockSetAppliedCoupons = jest.fn();
      const applied: CartAppliedCoupon = {
        coupon_id:       "uuid-1",
        code:            "SAVE20",
        coupon_name:     "Save 20%",
        discount_amount: 120,
        discount_type:   "percentage",
        discount_value:  20,
      };

      mockUseCart.mockReturnValue(
        buildCartContext({
          subtotal:          600,
          applied_coupons:   [applied],
          setAppliedCoupons: mockSetAppliedCoupons,
        })
      );

      render(<UnifiedCartSummary show_coupon_field />);

      const remove_btn = screen.getByRole("button", { name: /remove coupon SAVE20/i });
      fireEvent.click(remove_btn);

      expect(mockSetAppliedCoupons).toHaveBeenCalled();
    });
  });

  // ─── Credits mode ───────────────────────────────────────────────────────

  describe("credits payment mode", () => {
    it("hides coupon field when paying with credits", () => {
      mockUseCart.mockReturnValue(
        buildCartContext({ subtotal: 600 })
      );

      render(
        <UnifiedCartSummary
          show_coupon_field
          is_applying_credits
          credits_to_apply={200}
        />
      );

      expect(screen.queryByPlaceholderText("PROMO CODE")).not.toBeInTheDocument();
    });

    it("shows credits notice when is_applying_credits is true", () => {
      mockUseCart.mockReturnValue(
        buildCartContext({ subtotal: 600 })
      );

      render(
        <UnifiedCartSummary
          show_coupon_field
          is_applying_credits
          credits_to_apply={100}
        />
      );

      expect(
        screen.getByText(/promo codes and bulk discounts are not available when paying with account credits/i)
      ).toBeInTheDocument();
    });

    it("shows $0.00 total and credits-covered message when credits fully cover the order", () => {
      mockUseCart.mockReturnValue(
        buildCartContext({ subtotal: 200, total: 200 })
      );

      render(
        <UnifiedCartSummary
          is_applying_credits
          credits_to_apply={200}
          checkout_action={{ total: 200, is_processing: false, onSubmit: jest.fn() }}
        />
      );

      expect(
        screen.getByText(/your credits fully cover this order/i)
      ).toBeInTheDocument();
    });
  });

  // ─── Payment error banner ────────────────────────────────────────────────

  describe("payment error", () => {
    it("shows payment error banner when payment_error is provided", () => {
      render(
        <UnifiedCartSummary
          checkout_action={{ total: 100, is_processing: false, onSubmit: jest.fn() }}
          payment_error="Your card was declined."
        />
      );

      expect(screen.getByText("Payment failed")).toBeInTheDocument();
      expect(screen.getByText("Your card was declined.")).toBeInTheDocument();
    });

    it("does not show error banner when payment_error is null", () => {
      render(
        <UnifiedCartSummary
          checkout_action={{ total: 100, is_processing: false, onSubmit: jest.fn() }}
          payment_error={null}
        />
      );

      expect(screen.queryByText("Payment failed")).not.toBeInTheDocument();
    });

    it("does not show error banner without a checkout_action", () => {
      render(<UnifiedCartSummary payment_error="Some error" />);

      expect(screen.queryByText("Payment failed")).not.toBeInTheDocument();
    });
  });

  // ─── Checkout action button ──────────────────────────────────────────────

  describe("checkout action button", () => {
    it("renders Complete Purchase button when checkout_action is provided", () => {
      render(
        <UnifiedCartSummary
          checkout_action={{ total: 500, is_processing: false, onSubmit: jest.fn() }}
        />
      );

      expect(screen.getByText(/complete purchase/i)).toBeInTheDocument();
    });

    it("renders Processing payment text when is_processing is true", () => {
      render(
        <UnifiedCartSummary
          checkout_action={{ total: 500, is_processing: true, onSubmit: jest.fn() }}
        />
      );

      expect(screen.getByText(/processing payment/i)).toBeInTheDocument();
    });

    it("calls onSubmit when checkout button is clicked", () => {
      const onSubmit = jest.fn();

      render(
        <UnifiedCartSummary
          checkout_action={{ total: 100, is_processing: false, onSubmit }}
        />
      );

      fireEvent.click(screen.getByText(/complete purchase/i));

      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it("checkout button is disabled when is_processing is true", () => {
      render(
        <UnifiedCartSummary
          checkout_action={{ total: 100, is_processing: true, onSubmit: jest.fn() }}
        />
      );

      const btn = screen.getByRole("button", { name: /processing payment/i });
      expect(btn).toBeDisabled();
    });

    it("shows Stripe security badge below checkout button", () => {
      render(
        <UnifiedCartSummary
          checkout_action={{ total: 100, is_processing: false, onSubmit: jest.fn() }}
        />
      );

      expect(screen.getByText(/secured.*encrypted by stripe/i)).toBeInTheDocument();
    });
  });

  // ─── Back button ─────────────────────────────────────────────────────────

  describe("back button", () => {
    it("renders back button when on_back is provided", () => {
      render(<UnifiedCartSummary on_back={jest.fn()} back_label="Go Back" />);

      expect(screen.getByRole("button", { name: /go back/i })).toBeInTheDocument();
    });

    it("calls on_back when back button is clicked", () => {
      const on_back = jest.fn();

      render(<UnifiedCartSummary on_back={on_back} />);

      fireEvent.click(screen.getByRole("button", { name: /back/i }));

      expect(on_back).toHaveBeenCalledTimes(1);
    });

    it("does not render back button when on_back is not provided", () => {
      render(<UnifiedCartSummary />);

      expect(screen.queryByRole("button", { name: /back/i })).not.toBeInTheDocument();
    });
  });

  // ─── Pay Later coupon discount display ───────────────────────────────────────
  //
  // Regression: when a client applied a promo code and then chose "Pay Later",
  // the invoice was showing the full price instead of the discounted total.
  // These tests confirm the cart summary correctly reflects the coupon discount
  // in the pay-later step — the same summary component is rendered at that step.

  describe("pay later coupon discount display", () => {
    it("shows the discounted total when a coupon is applied in pay-later context", () => {
      const applied: CartAppliedCoupon = {
        coupon_id:       "coupon-uuid-1",
        code:            "UNIPHORE",
        coupon_name:     "Uniphore 10% Off",
        discount_amount: 100,
        discount_type:   "percentage",
        discount_value:  10,
      };

      mockUseCart.mockReturnValue(
        buildCartContext({
          items: [makeCartItem({ quantity: 5, unit_price: 200 })],
          subtotal:                  1000,
          applied_coupons:           [applied],
          total_discount:            100,
          effective_discount_amount: 100,
          active_discount_type:      "coupon",
          total:                     900,
        })
      );

      render(
        <UnifiedCartSummary
          show_coupon_field
          is_quantity_locked
          checkout_action={{ total: 900, is_processing: false, onSubmit: jest.fn() }}
        />
      );

      expect(screen.getByText("Subtotal")).toBeInTheDocument();
      expect(screen.getByText("Coupon Discount")).toBeInTheDocument();
      expect(screen.getByText("$900.00")).toBeInTheDocument();
    });

    it("shows the coupon code and name badge in the order summary", () => {
      const applied: CartAppliedCoupon = {
        coupon_id:       "coupon-uuid-2",
        code:            "UNIPHORE",
        coupon_name:     "Uniphore 10% Off",
        discount_amount: 100,
        discount_type:   "percentage",
        discount_value:  10,
      };

      mockUseCart.mockReturnValue(
        buildCartContext({
          items:            [makeCartItem({ quantity: 5, unit_price: 200 })],
          subtotal:         1000,
          applied_coupons:  [applied],
          total_discount:   100,
          effective_discount_amount: 100,
          active_discount_type: "coupon",
          total:            900,
        })
      );

      render(<UnifiedCartSummary show_coupon_field is_quantity_locked />);

      expect(screen.getByText("Uniphore 10% Off")).toBeInTheDocument();
      expect(screen.getByText("UNIPHORE")).toBeInTheDocument();
    });

    it("shows the discount amount in the applied coupon badge", () => {
      const applied: CartAppliedCoupon = {
        coupon_id:       "coupon-uuid-3",
        code:            "SAVE150",
        coupon_name:     "$150 Discount",
        discount_amount: 150,
        discount_type:   "fixed_amount",
        discount_value:  150,
      };

      mockUseCart.mockReturnValue(
        buildCartContext({
          items:            [makeCartItem({ quantity: 5, unit_price: 200 })],
          subtotal:         1000,
          applied_coupons:  [applied],
          total_discount:   150,
          effective_discount_amount: 150,
          active_discount_type: "coupon",
          total:            850,
        })
      );

      render(<UnifiedCartSummary show_coupon_field is_quantity_locked />);

      // −$150.00 appears in both the badge and the discount line — both are valid
      const discount_els = screen.getAllByText("−$150.00");
      expect(discount_els.length).toBeGreaterThanOrEqual(1);
    });

    it("does not show bulk discount when coupon is active in pay-later summary", () => {
      const applied: CartAppliedCoupon = {
        coupon_id:       "coupon-uuid-4",
        code:            "BEATS-BULK",
        coupon_name:     "Beats Bulk",
        discount_amount: 120,
        discount_type:   "percentage",
        discount_value:  12,
      };

      mockUseCart.mockReturnValue(
        buildCartContext({
          items: [makeCartItem({ quantity: 10, unit_price: 100 })],
          subtotal:              1000,
          bulk_discount_amount:  100,
          applied_coupons:       [applied],
          total_discount:        120,
          effective_discount_amount: 120,
          active_discount_type:  "coupon",
          total:                 880,
          bulk_discount_details: [
            {
              config: {
                id:            "bd1",
                applies_to:    "link_building",
                discount_rate: 10,
                min_quantity:  10,
              },
              is_applied:      true,
              quantity_needed: 0,
              discount_amount: 100,
            },
          ],
        })
      );

      render(<UnifiedCartSummary show_coupon_field is_quantity_locked />);

      // Bulk discount badge should NOT be shown when coupon is active
      expect(screen.queryByText(/10% bulk discount applied/i)).not.toBeInTheDocument();
      // Coupon badge is shown instead
      expect(screen.getByText("Beats Bulk")).toBeInTheDocument();
    });

    it("total displayed to client matches the discounted amount in pay-later context", () => {
      const applied: CartAppliedCoupon = {
        coupon_id:       "coupon-uuid-5",
        code:            "UNIPHORE",
        coupon_name:     "Uniphore Discount",
        discount_amount: 200,
        discount_type:   "percentage",
        discount_value:  20,
      };

      mockUseCart.mockReturnValue(
        buildCartContext({
          items: [makeCartItem({ quantity: 5, unit_price: 200 })],
          subtotal:                  1000,
          applied_coupons:           [applied],
          total_discount:            200,
          effective_discount_amount: 200,
          active_discount_type:      "coupon",
          total:                     800,
        })
      );

      render(
        <UnifiedCartSummary
          is_quantity_locked
          checkout_action={{ total: 800, is_processing: false, onSubmit: jest.fn() }}
        />
      );

      // The grand total row must show the discounted price
      expect(screen.getByText("$800.00")).toBeInTheDocument();
      // The coupon discount line must be present
      expect(screen.getByText("Coupon Discount")).toBeInTheDocument();
    });

    it("quantity controls are locked at the pay-later confirmation step", () => {
      mockUseCart.mockReturnValue(
        buildCartContext({
          items:    [makeCartItem({ quantity: 3, unit_price: 200 })],
          subtotal: 600,
          total:    600,
        })
      );

      render(<UnifiedCartSummary is_quantity_locked />);

      const decrease_btn = screen.getByRole("button", { name: /decrease/i });
      const increase_btn = screen.getByRole("button", { name: /increase/i });
      expect(decrease_btn).toBeDisabled();
      expect(increase_btn).toBeDisabled();
    });

    it("locked quantities notice is shown in pay-later step", () => {
      mockUseCart.mockReturnValue(
        buildCartContext({
          items:    [makeCartItem({ quantity: 2 })],
          subtotal: 200,
          total:    200,
        })
      );

      render(<UnifiedCartSummary is_quantity_locked />);

      expect(screen.getByText(/quantities are locked/i)).toBeInTheDocument();
    });
  });
});
