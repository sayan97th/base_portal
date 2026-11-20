import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import GiftCardRewardCheckoutCard from "@/components/gift-card-rewards/GiftCardRewardCheckoutCard";
import type { CartAppliedCoupon } from "@/types/client/unified-cart";
import type { GiftCardRewardDetails } from "@/types/client/gift-card-rewards";

jest.mock("@/context/CartContext", () => ({
  useCart: jest.fn(),
}));

jest.mock("@/context/auth-context-store", () => ({
  useOptionalAuth: jest.fn(),
}));

import { useCart } from "@/context/CartContext";
import { useOptionalAuth } from "@/context/auth-context-store";

const mockUseCart = useCart as jest.MockedFunction<typeof useCart>;
const mockUseOptionalAuth = useOptionalAuth as jest.MockedFunction<typeof useOptionalAuth>;

const reward_coupon: CartAppliedCoupon = {
  coupon_id: "holiday-uuid",
  code: "HAPPYHOLIDAYS",
  coupon_name: "Happy Holidays 10% Back",
  discount_amount: 0,
  discount_type: "gift_card_reward",
  discount_value: 10,
  is_gift_card_reward: true,
};

function setupCart(
  details: GiftCardRewardDetails = { recipient_email: "", gift_card_brand: "" },
  coupon: CartAppliedCoupon | null = reward_coupon
) {
  const setGiftCardRewardDetails = jest.fn();
  mockUseCart.mockReturnValue({
    gift_card_reward_coupon: coupon,
    gift_card_reward_amount: 80,
    gift_card_reward_details: details,
    setGiftCardRewardDetails,
  } as unknown as ReturnType<typeof useCart>);
  return setGiftCardRewardDetails;
}

function mockUser(email: string, business_email: string | null = null) {
  mockUseOptionalAuth.mockReturnValue({
    user: { email, business_email },
  } as unknown as ReturnType<typeof useOptionalAuth>);
}

describe("GiftCardRewardCheckoutCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseOptionalAuth.mockReturnValue(null);
  });

  it("renders nothing without a money back promo", () => {
    setupCart(undefined, null);
    const { container } = render(<GiftCardRewardCheckoutCard />);

    expect(container).toBeEmptyDOMElement();
  });

  it("prompts for the gift card and the email with the reward value", () => {
    setupCart();
    render(<GiftCardRewardCheckoutCard />);

    expect(screen.getByText(/claim your holiday gift card/i)).toBeInTheDocument();
    expect(screen.getByText("$80.00")).toBeInTheDocument();
    expect(screen.getByText(/thanks for using HAPPYHOLIDAYS/i)).toHaveTextContent("10% of this order");
    expect(screen.getByRole("radio", { name: /amazon/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /visa/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /target/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/where should we send it/i)).toBeInTheDocument();
    expect(screen.getByText(/optional\. you can also finish this later/i)).toBeInTheDocument();
  });

  it.each([
    [{ recipient_email: "", gift_card_brand: "" }, "Not started", 0],
    [{ recipient_email: "", gift_card_brand: "visa" }, "In progress", 1],
    [{ recipient_email: "me@exa", gift_card_brand: "" }, "In progress", 0],
    [{ recipient_email: "me@example.com", gift_card_brand: "" }, "In progress", 1],
    [{ recipient_email: "me@example.com", gift_card_brand: "visa" }, "Ready", 2],
  ] as [GiftCardRewardDetails, string, number][])(
    "shows the %o details as %s with %i of 2 steps done",
    (details, status_label, steps_done) => {
      setupCart(details);
      render(<GiftCardRewardCheckoutCard />);

      expect(screen.getByText(status_label)).toBeInTheDocument();
      expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", String(steps_done));
    }
  );

  it("passes brand choices up to the cart", () => {
    const setDetails = setupCart();
    render(<GiftCardRewardCheckoutCard />);

    fireEvent.click(screen.getByRole("radio", { name: /target/i }));
    expect(setDetails).toHaveBeenCalledWith({ recipient_email: "", gift_card_brand: "target" });
  });

  it("flags an invalid email", () => {
    setupCart({ recipient_email: "not-an-email", gift_card_brand: "amazon" });
    render(<GiftCardRewardCheckoutCard />);

    expect(screen.getByText("Please enter a valid email address.")).toBeInTheDocument();
    expect(screen.getByLabelText(/where should we send it/i)).toHaveAttribute("aria-invalid", "true");
  });

  it("offers the business email of the account as a shortcut", () => {
    mockUser("owner@company.com", "billing@company.com");
    const setDetails = setupCart();
    render(<GiftCardRewardCheckoutCard />);

    fireEvent.click(screen.getByRole("button", { name: /use my account email/i }));
    expect(setDetails).toHaveBeenCalledWith({ recipient_email: "billing@company.com", gift_card_brand: "" });
  });

  it("falls back to the login email when there is no business email", () => {
    mockUser("owner@company.com");
    setupCart();
    render(<GiftCardRewardCheckoutCard />);

    expect(screen.getByRole("button", { name: /use my account email/i })).toHaveTextContent("owner@company.com");
  });

  it("hides the shortcut outside an auth provider", () => {
    setupCart();
    render(<GiftCardRewardCheckoutCard />);

    expect(screen.queryByRole("button", { name: /use my account email/i })).not.toBeInTheDocument();
  });

  it("only offers Done once both fields are valid", () => {
    setupCart({ recipient_email: "me@example.com", gift_card_brand: "" });
    const { rerender } = render(<GiftCardRewardCheckoutCard />);
    expect(screen.queryByRole("button", { name: /^done$/i })).not.toBeInTheDocument();

    setupCart({ recipient_email: "me@example.com", gift_card_brand: "visa" });
    rerender(<GiftCardRewardCheckoutCard />);
    expect(screen.getByRole("button", { name: /^done$/i })).toBeInTheDocument();
    expect(screen.getByText(/all set\. we will send these details with your order/i)).toBeInTheDocument();
  });

  it("collapses into a summary and opens again with Edit", () => {
    setupCart({ recipient_email: "me@example.com", gift_card_brand: "visa" });
    render(<GiftCardRewardCheckoutCard />);

    fireEvent.click(screen.getByRole("button", { name: /^done$/i }));

    expect(screen.getByText("Visa gift card, $80.00")).toBeInTheDocument();
    expect(screen.getByText("Sent to me@example.com")).toBeInTheDocument();
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^edit$/i }));
    expect(screen.getByRole("radiogroup")).toBeInTheDocument();
  });

  it("never uses an em dash in the copy", () => {
    setupCart({ recipient_email: "me@example.com", gift_card_brand: "amazon" });
    const { container } = render(<GiftCardRewardCheckoutCard />);

    expect(container.textContent).not.toContain("—");
  });
});
