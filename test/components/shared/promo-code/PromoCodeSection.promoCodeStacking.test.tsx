/**
 * Promotions never stack when the client applies a promo code
 * (PromoCodeSection).
 *
 * The code is always validated against the full subtotal, since a promo code
 * replaces the bulk discount. A one time notice tells the client when a price
 * discount promo code saves less than the bulk discount it replaces.
 */

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import PromoCodeSection from "@/components/shared/promo-code/PromoCodeSection";
import { validateCoupon } from "@/services/client/coupons.service";
import type { CartItem } from "@/types/client/unified-cart";

jest.mock("@/context/CartContext", () => ({
  useCart: jest.fn(),
}));

jest.mock("@/services/client/coupons.service", () => ({
  validateCoupon: jest.fn(),
}));

import { useCart } from "@/context/CartContext";

const mock_use_cart = useCart as jest.MockedFunction<typeof useCart>;
const mock_validate_coupon = validateCoupon as jest.MockedFunction<typeof validateCoupon>;

type ValidateResponse = Awaited<ReturnType<typeof validateCoupon>>;

const ten_links: CartItem[] = [
  { cart_item_id: "1", product_type: "link_building", tier_id: "dr50", tier_name: "DR 50+", quantity: 10, unit_price: 400 },
] as CartItem[];

function validResponse(overrides: Partial<ValidateResponse> = {}): ValidateResponse {
  return {
    valid: true,
    coupon_id: "save5-uuid",
    code: "SAVE5",
    name: "Save 5%",
    discount_amount: 200,
    discount_type: "percentage",
    discount_value: 5,
    applies_to: "all",
    product_types: [],
    minimum_purchase_amount: null,
    max_discount_amount: null,
    dr_tier_id: null,
    is_gift_card_reward: false,
    message: "Coupon applied successfully.",
    ...overrides,
  } as unknown as ValidateResponse;
}

const reward_response = validResponse({
  coupon_id: "holiday-uuid",
  code: "HAPPYHOLIDAYS",
  name: "Happy Holidays 10% Back",
  discount_amount: 0,
  discount_type: "gift_card_reward",
  discount_value: 10,
  is_gift_card_reward: true,
  reward_amount: 400,
} as Partial<ValidateResponse>);

function setupCart(bulk_discount_amount: number, coupon_input_code: string) {
  const cart = {
    items: ten_links,
    subtotal: 4000,
    bulk_discount_amount,
    applied_coupons: [],
    coupon_input_code,
    setAppliedCoupons: jest.fn(),
    setCouponInputCode: jest.fn(),
    setCouponAdjustmentNotice: jest.fn(),
  };
  mock_use_cart.mockReturnValue(cart as unknown as ReturnType<typeof useCart>);
  return cart;
}

async function applyCode() {
  render(<PromoCodeSection />);
  fireEvent.click(screen.getByRole("button", { name: /apply/i }));
}

describe("PromoCodeSection promo code stacking", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("validates the promo code against the full subtotal, not the bulk price", async () => {
    setupCart(400, "HAPPYHOLIDAYS");
    mock_validate_coupon.mockResolvedValue(reward_response);

    await applyCode();

    await waitFor(() => expect(mock_validate_coupon).toHaveBeenCalledTimes(1));
    expect(mock_validate_coupon.mock.calls[0][0]).toMatchObject({ code: "HAPPYHOLIDAYS", order_amount: 4000 });
  });

  it("applies a money back promo code without a one time notice, the summary explains the replaced discount", async () => {
    const cart = setupCart(400, "HAPPYHOLIDAYS");
    mock_validate_coupon.mockResolvedValue(reward_response);

    await applyCode();

    await waitFor(() => expect(cart.setAppliedCoupons).toHaveBeenCalledTimes(1));
    expect(cart.setAppliedCoupons.mock.calls[0][0]).toEqual([
      expect.objectContaining({ code: "HAPPYHOLIDAYS", is_gift_card_reward: true, discount_amount: 0 }),
    ]);
    expect(cart.setCouponAdjustmentNotice).toHaveBeenCalledTimes(1);
    expect(cart.setCouponAdjustmentNotice).toHaveBeenCalledWith(null);
  });

  it("warns when a price discount promo code saves less than the bulk discount it replaces", async () => {
    const cart = setupCart(400, "SAVE5");
    mock_validate_coupon.mockResolvedValue(validResponse());

    await applyCode();

    await waitFor(() =>
      expect(cart.setCouponAdjustmentNotice).toHaveBeenLastCalledWith(
        'Promo code "SAVE5" applied. It replaces the bulk discount ($400.00) with this promo ($200.00).'
      )
    );
    expect(cart.setAppliedCoupons).toHaveBeenCalledTimes(1);
  });

  it("does not warn when the promo code saves more than the bulk discount", async () => {
    const cart = setupCart(400, "SAVE20");
    mock_validate_coupon.mockResolvedValue(validResponse({ code: "SAVE20", discount_amount: 800, discount_value: 20 }));

    await applyCode();

    await waitFor(() => expect(cart.setAppliedCoupons).toHaveBeenCalledTimes(1));
    expect(cart.setCouponAdjustmentNotice).toHaveBeenCalledTimes(1);
    expect(cart.setCouponAdjustmentNotice).toHaveBeenCalledWith(null);
  });

  it("does not warn when the cart has no bulk discount", async () => {
    const cart = setupCart(0, "SAVE5");
    mock_validate_coupon.mockResolvedValue(validResponse());

    await applyCode();

    await waitFor(() => expect(cart.setAppliedCoupons).toHaveBeenCalledTimes(1));
    expect(cart.setCouponAdjustmentNotice).toHaveBeenCalledWith(null);
    expect(cart.setCouponAdjustmentNotice).toHaveBeenCalledTimes(1);
  });
});
