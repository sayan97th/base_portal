/**
 * Checkout gift card card (GiftCardRewardCheckoutCard) with the HAPPYHOLIDAYS
 * limit: the client must see that the gift card goes "up to $1,000" and be
 * told when their order already reached that maximum.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import GiftCardRewardCheckoutCard from "@/components/gift-card-rewards/GiftCardRewardCheckoutCard";
import type { CartAppliedCoupon, CartItem } from "@/types/client/unified-cart";

jest.mock("@/context/CartContext", () => ({
  useCart: jest.fn(),
}));

jest.mock("@/context/auth-context-store", () => ({
  useOptionalAuth: jest.fn(() => null),
}));

import { useCart } from "@/context/CartContext";

const mockUseCart = useCart as jest.MockedFunction<typeof useCart>;

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

function setupCart(reward_amount: number, coupon: CartAppliedCoupon = holiday_coupon) {
  const items: CartItem[] = [
    {
      cart_item_id: "item-1",
      product_type: "link_building",
      tier_id: "dr80",
      tier_name: "DR 80+",
      quantity: 1,
      unit_price: reward_amount * 10,
    } as CartItem,
  ];

  mockUseCart.mockReturnValue({
    items,
    gift_card_reward_coupon: coupon,
    gift_card_reward_amount: reward_amount,
    gift_card_reward_details: { recipient_email: "", gift_card_brand: "" },
    setGiftCardRewardDetails: jest.fn(),
  } as unknown as ReturnType<typeof useCart>);
}

describe("GiftCardRewardCheckoutCard with a gift card limit", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("explains the gift card is 10% of the order up to $1,000", () => {
    setupCart(400);
    render(<GiftCardRewardCheckoutCard />);

    expect(screen.getByText(/worth\s+10% of this order total\s*, up to \$1,000\./)).toBeInTheDocument();
    expect(screen.getByText("$400.00")).toBeInTheDocument();
  });

  it("does not show the maximum notice below the limit", () => {
    setupCart(999.99);
    render(<GiftCardRewardCheckoutCard />);

    expect(screen.queryByText(/reached the \$1,000 maximum/)).not.toBeInTheDocument();
  });

  it("tells the client when the gift card reached the limit", () => {
    setupCart(1000);
    render(<GiftCardRewardCheckoutCard />);

    expect(screen.getByText("Your gift card reached the $1,000 maximum for this promo.")).toBeInTheDocument();
    expect(screen.getByText("$1,000.00")).toBeInTheDocument();
  });

  it("keeps the original copy for a promo without a limit", () => {
    setupCart(5000, { ...holiday_coupon, max_discount_amount: null });
    render(<GiftCardRewardCheckoutCard />);

    expect(screen.getByText(/worth\s+10% of this order total\./)).toBeInTheDocument();
    expect(screen.queryByText(/up to \$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/maximum for this promo/)).not.toBeInTheDocument();
    expect(screen.getByText("$5,000.00")).toBeInTheDocument();
  });

  it("shows cents in the limit when it has them", () => {
    setupCart(1250.5, { ...holiday_coupon, max_discount_amount: 1250.5 });
    render(<GiftCardRewardCheckoutCard />);

    expect(screen.getByText(/up to \$1,250\.50\./)).toBeInTheDocument();
    expect(screen.getByText("Your gift card reached the $1,250.50 maximum for this promo.")).toBeInTheDocument();
  });
});
