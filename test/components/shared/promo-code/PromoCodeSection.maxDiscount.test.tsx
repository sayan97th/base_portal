/**
 * Promo code box with a per order limit (max_discount_amount): the limit
 * returned by POST /api/coupons/validate is stored on the applied coupon (so
 * the cart can cap its estimate) and shown on the applied promo ticket.
 */

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import PromoCodeSection from "@/components/shared/promo-code/PromoCodeSection";
import { validateCoupon } from "@/services/client/coupons.service";
import type { CartAppliedCoupon, CartItem } from "@/types/client/unified-cart";

jest.mock("@/context/CartContext", () => ({
  useCart: jest.fn(),
}));

jest.mock("@/services/client/coupons.service", () => ({
  validateCoupon: jest.fn(),
}));

import { useCart } from "@/context/CartContext";

const mockUseCart = useCart as jest.MockedFunction<typeof useCart>;
const mockValidateCoupon = validateCoupon as jest.MockedFunction<typeof validateCoupon>;

type ValidateResponse = Awaited<ReturnType<typeof validateCoupon>>;

const cart_items = [
  { cart_item_id: "1", product_type: "link_building", tier_id: "dr80", tier_name: "DR 80+", quantity: 5, unit_price: 10000 },
] as CartItem[];

const holiday_coupon: CartAppliedCoupon = {
  coupon_id: "holiday-uuid",
  code: "HAPPYHOLIDAYS",
  coupon_name: "Happy Holidays 10% Back",
  discount_amount: 0,
  discount_type: "gift_card_reward",
  discount_value: 10,
  max_discount_amount: 1000,
  is_gift_card_reward: true,
};

function validResponse(overrides: Partial<ValidateResponse> = {}): ValidateResponse {
  return {
    valid: true,
    coupon_id: "holiday-uuid",
    code: "HAPPYHOLIDAYS",
    name: "Happy Holidays 10% Back",
    discount_amount: 0,
    discount_type: "gift_card_reward",
    discount_value: 10,
    applies_to: "all",
    product_types: [],
    minimum_purchase_amount: null,
    max_discount_amount: 1000,
    dr_tier_id: null,
    is_gift_card_reward: true,
    reward_percentage: 10,
    reward_amount: 1000,
    is_reward_capped: true,
    message: "Promo code applied.",
    ...overrides,
  } as ValidateResponse;
}

function setupCart(overrides: { applied_coupons?: CartAppliedCoupon[]; coupon_input_code?: string } = {}) {
  const cart = {
    items: cart_items,
    subtotal: 50000,
    bulk_discount_amount: 0,
    applied_coupons: [] as CartAppliedCoupon[],
    coupon_input_code: "",
    ...overrides,
    setAppliedCoupons: jest.fn(),
    setCouponInputCode: jest.fn(),
    setCouponAdjustmentNotice: jest.fn(),
  };
  mockUseCart.mockReturnValue(cart as unknown as ReturnType<typeof useCart>);
  return cart;
}

describe("PromoCodeSection with a per order limit", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("applying a code", () => {
    it("stores the HAPPYHOLIDAYS limit on the applied coupon", async () => {
      const cart = setupCart({ coupon_input_code: "HAPPYHOLIDAYS" });
      mockValidateCoupon.mockResolvedValue(validResponse());
      render(<PromoCodeSection />);

      fireEvent.click(screen.getByRole("button", { name: /apply/i }));

      await waitFor(() =>
        expect(cart.setAppliedCoupons).toHaveBeenCalledWith([
          expect.objectContaining({ code: "HAPPYHOLIDAYS", is_gift_card_reward: true, max_discount_amount: 1000 }),
        ])
      );
    });

    it("stores null when the coupon has no limit", async () => {
      const cart = setupCart({ coupon_input_code: "HAPPYHOLIDAYS" });
      mockValidateCoupon.mockResolvedValue(validResponse({ max_discount_amount: null }));
      render(<PromoCodeSection />);

      fireEvent.click(screen.getByRole("button", { name: /apply/i }));

      await waitFor(() =>
        expect(cart.setAppliedCoupons).toHaveBeenCalledWith([expect.objectContaining({ max_discount_amount: null })])
      );
    });

    it("stores null when an older API response has no limit field", async () => {
      const cart = setupCart({ coupon_input_code: "HAPPYHOLIDAYS" });
      const response = validResponse();
      delete response.max_discount_amount;
      mockValidateCoupon.mockResolvedValue(response);
      render(<PromoCodeSection />);

      fireEvent.click(screen.getByRole("button", { name: /apply/i }));

      await waitFor(() =>
        expect(cart.setAppliedCoupons).toHaveBeenCalledWith([expect.objectContaining({ max_discount_amount: null })])
      );
    });

    it("stores the limit of a percentage coupon", async () => {
      const cart = setupCart({ coupon_input_code: "SAVE20" });
      mockValidateCoupon.mockResolvedValue(
        validResponse({
          coupon_id: "save20-uuid",
          code: "SAVE20",
          name: "Save 20%",
          discount_type: "percentage",
          discount_value: 20,
          discount_amount: 300,
          max_discount_amount: 300,
          is_gift_card_reward: false,
          reward_amount: 0,
          is_reward_capped: false,
        })
      );
      render(<PromoCodeSection />);

      fireEvent.click(screen.getByRole("button", { name: /apply/i }));

      await waitFor(() =>
        expect(cart.setAppliedCoupons).toHaveBeenCalledWith([
          expect.objectContaining({ code: "SAVE20", discount_amount: 300, max_discount_amount: 300 }),
        ])
      );
    });
  });

  describe("applied promo ticket", () => {
    it("tells the client the gift card goes up to $1,000 per order", () => {
      setupCart({ applied_coupons: [holiday_coupon] });
      render(<PromoCodeSection />);

      expect(screen.getByText("HAPPYHOLIDAYS")).toBeInTheDocument();
      expect(screen.getByText("10% back")).toBeInTheDocument();
      expect(screen.getByText("Gift card up to $1,000 per order")).toBeInTheDocument();
    });

    it("tells the client how much a percentage coupon can save at most", () => {
      setupCart({
        applied_coupons: [
          {
            ...holiday_coupon,
            coupon_id: "save20-uuid",
            code: "SAVE20",
            coupon_name: "Save 20%",
            discount_type: "percentage",
            discount_value: 20,
            discount_amount: 300,
            max_discount_amount: 300,
            is_gift_card_reward: false,
          },
        ],
      });
      render(<PromoCodeSection />);

      expect(screen.getByText("Saves up to $300 per order")).toBeInTheDocument();
    });

    it("shows no limit line when the coupon has none", () => {
      setupCart({ applied_coupons: [{ ...holiday_coupon, max_discount_amount: null }] });
      render(<PromoCodeSection />);

      expect(screen.getByText("10% back")).toBeInTheDocument();
      expect(screen.queryByText(/up to \$/)).not.toBeInTheDocument();
    });
  });
});
