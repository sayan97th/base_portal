import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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

const cart_items: CartItem[] = [
  { cart_item_id: "1", product_type: "link_building", tier_id: "dr50", tier_name: "DR 50+", quantity: 2, unit_price: 400 },
  { cart_item_id: "2", product_type: "new_content", tier_id: "nc1", tier_name: "Standard", quantity: 1, unit_price: 200 },
] as CartItem[];

const reward_coupon: CartAppliedCoupon = {
  coupon_id: "holiday-uuid",
  code: "HAPPYHOLIDAYS",
  coupon_name: "Happy Holidays 10% Back",
  discount_amount: 0,
  discount_type: "gift_card_reward",
  discount_value: 10,
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
    dr_tier_id: null,
    is_gift_card_reward: true,
    message: null,
    ...overrides,
  } as unknown as ValidateResponse;
}

type CartState = Pick<
  ReturnType<typeof useCart>,
  "items" | "subtotal" | "bulk_discount_amount" | "applied_coupons" | "coupon_input_code"
>;

function setupCart(overrides: Partial<CartState> = {}) {
  const cart = {
    items: cart_items,
    subtotal: 1000,
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

describe("PromoCodeSection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("entering a code", () => {
    it("shows the field with a disabled Apply button while empty", () => {
      setupCart();
      render(<PromoCodeSection />);

      expect(screen.getByLabelText("Promo code")).toHaveAttribute("placeholder", "PROMO CODE");
      expect(screen.getByRole("button", { name: /apply/i })).toBeDisabled();
      expect(screen.getByText(/one promo code per order/i)).toBeInTheDocument();
    });

    it("uppercases what the client types", () => {
      const cart = setupCart();
      render(<PromoCodeSection />);

      fireEvent.change(screen.getByLabelText("Promo code"), { target: { value: "happyholidays" } });
      expect(cart.setCouponInputCode).toHaveBeenCalledWith("HAPPYHOLIDAYS");
    });

    it("validates against the full cart with per product amounts", async () => {
      setupCart({ coupon_input_code: "HAPPYHOLIDAYS" });
      mockValidateCoupon.mockResolvedValue(validResponse());
      render(<PromoCodeSection />);

      fireEvent.click(screen.getByRole("button", { name: /apply/i }));

      await waitFor(() =>
        expect(mockValidateCoupon).toHaveBeenCalledWith({
          code: "HAPPYHOLIDAYS",
          order_amount: 1000,
          cart_product_types: ["link_building", "new_content"],
          product_type_amounts: { link_building: 800, new_content: 200 },
          dr_tier_ids: ["dr50"],
          dr_tier_amounts: { dr50: 800 },
        })
      );
    });

    it("applies the code when Enter is pressed", async () => {
      setupCart({ coupon_input_code: "HAPPYHOLIDAYS" });
      mockValidateCoupon.mockResolvedValue(validResponse());
      render(<PromoCodeSection />);

      fireEvent.keyDown(screen.getByLabelText("Promo code"), { key: "Enter" });
      await waitFor(() => expect(mockValidateCoupon).toHaveBeenCalledTimes(1));
    });

    it("ignores whitespace only codes", () => {
      setupCart({ coupon_input_code: "   " });
      render(<PromoCodeSection />);

      fireEvent.keyDown(screen.getByLabelText("Promo code"), { key: "Enter" });
      expect(mockValidateCoupon).not.toHaveBeenCalled();
    });
  });

  describe("applying HAPPYHOLIDAYS", () => {
    it("stores the code flagged as a gift card reward and clears the field", async () => {
      const cart = setupCart({ coupon_input_code: "HAPPYHOLIDAYS" });
      mockValidateCoupon.mockResolvedValue(validResponse());
      render(<PromoCodeSection />);

      fireEvent.click(screen.getByRole("button", { name: /apply/i }));

      await waitFor(() =>
        expect(cart.setAppliedCoupons).toHaveBeenCalledWith([
          expect.objectContaining({
            coupon_id: "holiday-uuid",
            code: "HAPPYHOLIDAYS",
            discount_amount: 0,
            discount_value: 10,
            is_gift_card_reward: true,
          }),
        ])
      );
      expect(cart.setCouponInputCode).toHaveBeenCalledWith("");
    });

    it("keeps the bulk discount, so no override notice is shown", async () => {
      const cart = setupCart({ coupon_input_code: "HAPPYHOLIDAYS", bulk_discount_amount: 50 });
      mockValidateCoupon.mockResolvedValue(validResponse());
      render(<PromoCodeSection />);

      fireEvent.click(screen.getByRole("button", { name: /apply/i }));

      await waitFor(() => expect(cart.setAppliedCoupons).toHaveBeenCalled());
      expect(cart.setCouponAdjustmentNotice).not.toHaveBeenCalledWith(expect.any(String));
    });

    it("shows a festive ticket with the reward percentage once applied", () => {
      setupCart({ applied_coupons: [reward_coupon] });
      render(<PromoCodeSection />);

      expect(screen.getByText("HAPPYHOLIDAYS")).toBeInTheDocument();
      expect(screen.getByText("Happy Holidays 10% Back")).toBeInTheDocument();
      expect(screen.getByText("10% back")).toBeInTheDocument();
      expect(screen.getByText("Applied")).toBeInTheDocument();
      expect(screen.queryByPlaceholderText("PROMO CODE")).not.toBeInTheDocument();
    });

    it("removes the code from its ticket", () => {
      const cart = setupCart({ applied_coupons: [reward_coupon] });
      render(<PromoCodeSection />);

      fireEvent.click(screen.getByRole("button", { name: /remove coupon HAPPYHOLIDAYS/i }));

      const updater = cart.setAppliedCoupons.mock.calls[0][0] as (prev: CartAppliedCoupon[]) => CartAppliedCoupon[];
      expect(updater([reward_coupon])).toEqual([]);
      expect(cart.setCouponAdjustmentNotice).toHaveBeenCalledWith(null);
    });
  });

  describe("regular coupons", () => {
    it("shows the savings on the ticket", () => {
      setupCart({
        applied_coupons: [
          { coupon_id: "c1", code: "SAVE20", coupon_name: "Save 20%", discount_amount: 200, discount_type: "percentage", discount_value: 20 },
        ],
      });
      render(<PromoCodeSection />);

      expect(screen.getByText(/\$200\.00/)).toBeInTheDocument();
      expect(screen.queryByText(/back$/)).not.toBeInTheDocument();
    });

    it("explains when a weaker coupon replaces the bulk discount", async () => {
      const cart = setupCart({ coupon_input_code: "SAVE5", bulk_discount_amount: 100 });
      mockValidateCoupon.mockResolvedValue(
        validResponse({
          coupon_id: "c5",
          code: "SAVE5",
          name: "Save 5%",
          discount_type: "percentage",
          discount_value: 5,
          discount_amount: 50,
          is_gift_card_reward: false,
        })
      );
      render(<PromoCodeSection />);

      fireEvent.click(screen.getByRole("button", { name: /apply/i }));

      await waitFor(() =>
        expect(cart.setCouponAdjustmentNotice).toHaveBeenCalledWith(
          'Promo code "SAVE5" applied. It replaces the bulk discount ($100.00) with this promo ($50.00).'
        )
      );
      const notice = cart.setCouponAdjustmentNotice.mock.calls.find(([value]) => typeof value === "string")?.[0];
      expect(notice).not.toContain("—");
    });
  });

  describe("errors", () => {
    it("shows the API message for an invalid or expired code", async () => {
      const cart = setupCart({ coupon_input_code: "HAPPYHOLIDAYS" });
      mockValidateCoupon.mockResolvedValue(
        validResponse({ valid: false, message: "This promo code has expired." })
      );
      render(<PromoCodeSection />);

      fireEvent.click(screen.getByRole("button", { name: /apply/i }));

      expect(await screen.findByRole("alert")).toHaveTextContent("This promo code has expired.");
      expect(screen.getByLabelText("Promo code")).toHaveAttribute("aria-invalid", "true");
      expect(cart.setAppliedCoupons).not.toHaveBeenCalled();
    });

    it("falls back to a generic message when the API sends none", async () => {
      setupCart({ coupon_input_code: "NOPE" });
      mockValidateCoupon.mockResolvedValue(validResponse({ valid: false, message: undefined }));
      render(<PromoCodeSection />);

      fireEvent.click(screen.getByRole("button", { name: /apply/i }));
      expect(await screen.findByText("Invalid promo code.")).toBeInTheDocument();
    });

    it("shows a retry message when the request fails", async () => {
      setupCart({ coupon_input_code: "HAPPYHOLIDAYS" });
      mockValidateCoupon.mockRejectedValue(new Error("Network down"));
      render(<PromoCodeSection />);

      fireEvent.click(screen.getByRole("button", { name: /apply/i }));
      expect(await screen.findByText("Could not validate promo code. Please try again.")).toBeInTheDocument();
    });

    it("clears the error as soon as the client edits the code", async () => {
      setupCart({ coupon_input_code: "NOPE" });
      mockValidateCoupon.mockResolvedValue(validResponse({ valid: false, message: "Invalid promo code." }));
      render(<PromoCodeSection />);

      fireEvent.click(screen.getByRole("button", { name: /apply/i }));
      await screen.findByRole("alert");

      fireEvent.change(screen.getByLabelText("Promo code"), { target: { value: "NOPE2" } });
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("blocks double submits while a code is being checked", async () => {
      setupCart({ coupon_input_code: "HAPPYHOLIDAYS" });
      let resolve: (value: ValidateResponse) => void = () => {};
      mockValidateCoupon.mockReturnValue(new Promise((r) => (resolve = r)));
      render(<PromoCodeSection />);

      const button = screen.getByRole("button", { name: /apply/i });
      fireEvent.click(button);
      expect(await screen.findByText("Applying")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /applying/i })).toBeDisabled();

      fireEvent.keyDown(screen.getByLabelText("Promo code"), { key: "Enter" });
      expect(mockValidateCoupon).toHaveBeenCalledTimes(1);

      resolve(validResponse());
      await waitFor(() => expect(screen.queryByText("Applying")).not.toBeInTheDocument());
    });
  });
});
