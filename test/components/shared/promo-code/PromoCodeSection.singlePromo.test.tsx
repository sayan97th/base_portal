/**
 * One promo code per order in the cart (PromoCodeSection).
 *
 * Client request: "make sure this is the only offer they are able to apply to
 * their order. If they try to add another promo, show: This promo cannot be
 * combined with other offers."
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PromoCodeSection from "@/components/shared/promo-code/PromoCodeSection";
import { validateCoupon } from "@/services/client/coupons.service";
import { PROMO_COMBINATION_ERROR_MESSAGE } from "@/lib/promo-codes";
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

const cart_items: CartItem[] = [
  { cart_item_id: "1", product_type: "link_building", tier_id: "dr50", tier_name: "DR 50+", quantity: 2, unit_price: 400 },
] as CartItem[];

const holiday_coupon: CartAppliedCoupon = {
  coupon_id: "holiday-uuid",
  code: "HAPPYHOLIDAYS",
  coupon_name: "Happy Holidays 10% Back",
  discount_amount: 0,
  discount_type: "gift_card_reward",
  discount_value: 10,
  is_gift_card_reward: true,
};

const regular_coupon: CartAppliedCoupon = {
  coupon_id: "save10-uuid",
  code: "SAVE10",
  coupon_name: "Save 10%",
  discount_amount: 80,
  discount_type: "percentage",
  discount_value: 10,
};

function validResponse(overrides: Partial<ValidateResponse> = {}): ValidateResponse {
  return {
    valid: true,
    coupon_id: "save10-uuid",
    code: "SAVE10",
    name: "Save 10%",
    discount_amount: 80,
    discount_type: "percentage",
    discount_value: 10,
    applies_to: "all",
    product_types: [],
    minimum_purchase_amount: null,
    dr_tier_id: null,
    is_gift_card_reward: false,
    message: null,
    ...overrides,
  } as unknown as ValidateResponse;
}

function setupCart(overrides: { applied_coupons?: CartAppliedCoupon[]; coupon_input_code?: string } = {}) {
  const cart = {
    items: cart_items,
    subtotal: 800,
    bulk_discount_amount: 0,
    bulk_discount_details: [],
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

describe("PromoCodeSection, one promo code per order", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("before a promo code is applied", () => {
    it("tells the client that only one promo code can be used", () => {
      setupCart();
      render(<PromoCodeSection />);

      expect(screen.getByText("One promo code per order.")).toBeInTheDocument();
      expect(screen.queryByText(PROMO_COMBINATION_ERROR_MESSAGE, { exact: false })).not.toBeInTheDocument();
    });

    it("replaces the cart coupons with exactly one promo code, never appends", async () => {
      const cart = setupCart({ coupon_input_code: "SAVE10" });
      mockValidateCoupon.mockResolvedValue(validResponse());
      render(<PromoCodeSection />);

      fireEvent.click(screen.getByRole("button", { name: /apply/i }));

      await waitFor(() => expect(cart.setAppliedCoupons).toHaveBeenCalledTimes(1));
      const next_coupons = cart.setAppliedCoupons.mock.calls[0][0];
      expect(Array.isArray(next_coupons)).toBe(true);
      expect(next_coupons).toHaveLength(1);
      expect(next_coupons[0]).toEqual(expect.objectContaining({ code: "SAVE10", coupon_id: "save10-uuid" }));
    });
  });

  describe.each([
    ["a money back promo (HAPPYHOLIDAYS)", holiday_coupon],
    ["a regular discount coupon", regular_coupon],
  ])("once %s is applied", (_label, applied_coupon) => {
    it("hides the promo code field so a second code cannot be entered", () => {
      setupCart({ applied_coupons: [applied_coupon] });
      render(<PromoCodeSection />);

      expect(screen.getByText(applied_coupon.code)).toBeInTheDocument();
      expect(screen.queryByPlaceholderText("PROMO CODE")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^apply$/i })).not.toBeInTheDocument();
    });

    it("shows the client copy explaining promo codes cannot be combined", () => {
      setupCart({ applied_coupons: [applied_coupon] });
      render(<PromoCodeSection />);

      expect(
        screen.getByText(`${PROMO_COMBINATION_ERROR_MESSAGE} Remove it to use a different code.`)
      ).toBeInTheDocument();
    });

    it("lets the client remove the code to use a different one", () => {
      const cart = setupCart({ applied_coupons: [applied_coupon] });
      render(<PromoCodeSection />);

      fireEvent.click(screen.getByRole("button", { name: `Remove coupon ${applied_coupon.code}` }));

      const updater = cart.setAppliedCoupons.mock.calls[0][0] as (prev: CartAppliedCoupon[]) => CartAppliedCoupon[];
      expect(updater([applied_coupon])).toEqual([]);
    });
  });

  describe("after removing the applied code", () => {
    it("shows the field again with no combination message", () => {
      const cart = setupCart({ applied_coupons: [holiday_coupon] });
      const { rerender } = render(<PromoCodeSection />);

      fireEvent.click(screen.getByRole("button", { name: "Remove coupon HAPPYHOLIDAYS" }));
      setupCart({ applied_coupons: [] });
      rerender(<PromoCodeSection />);

      expect(cart.setAppliedCoupons).toHaveBeenCalled();
      expect(screen.getByPlaceholderText("PROMO CODE")).toBeInTheDocument();
      expect(screen.queryByText(PROMO_COMBINATION_ERROR_MESSAGE, { exact: false })).not.toBeInTheDocument();
    });
  });

  describe("API rejection", () => {
    it("shows the API combination message inline when the server refuses the code", async () => {
      const cart = setupCart({ coupon_input_code: "SAVE20" });
      mockValidateCoupon.mockResolvedValue(
        validResponse({ valid: false, code: "SAVE20", message: PROMO_COMBINATION_ERROR_MESSAGE })
      );
      render(<PromoCodeSection />);

      fireEvent.click(screen.getByRole("button", { name: /apply/i }));

      expect(await screen.findByRole("alert")).toHaveTextContent(PROMO_COMBINATION_ERROR_MESSAGE);
      expect(cart.setAppliedCoupons).not.toHaveBeenCalled();
    });
  });
});
