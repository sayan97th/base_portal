/**
 * Promo code section of LinkBuildingOrderSummary.
 *
 * Regression coverage: this summary used to accept a min_cart_for_coupon prop
 * and show "A minimum cart total of $X is required to use promo codes." There is
 * no global cart minimum for promo codes anymore, so small carts must render
 * the promo field with no warning and let the code be submitted.
 */

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import LinkBuildingOrderSummary, {
  type AppliedCouponItem,
  type MultiCouponState,
  type OrderSummaryItem,
} from "@/components/link-building/LinkBuildingOrderSummary";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const small_cart_items: OrderSummaryItem[] = [
  { id: "dr50", label: "DR 50+", quantity: 1, unit_price: 400 },
];

function makeCouponState(overrides: Partial<MultiCouponState> = {}): MultiCouponState {
  return {
    input_code:      "",
    applied_coupons: [],
    error:           null,
    is_applying:     false,
    ...overrides,
  };
}

function renderSummary(
  props: Partial<React.ComponentProps<typeof LinkBuildingOrderSummary>> = {}
) {
  const handlers = {
    onAction:           jest.fn(),
    onCouponCodeChange: jest.fn(),
    onApplyCoupon:      jest.fn(),
    onRemoveCoupon:     jest.fn(),
  };

  render(
    <LinkBuildingOrderSummary
      selected_items={small_cart_items}
      total={400}
      total_links={1}
      action_label="Continue"
      show_coupon_field
      coupon_state={makeCouponState()}
      {...handlers}
      {...props}
    />
  );

  return handlers;
}

function addButton() {
  return screen.getByRole("button", { name: /^add$/i });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("LinkBuildingOrderSummary promo codes", () => {
  it("renders the promo field for a $400 cart", () => {
    renderSummary();

    expect(screen.getByText("Promo Codes")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("PROMO CODE")).toBeInTheDocument();
  });

  it("does not show a minimum cart warning while typing a code on a small cart", () => {
    renderSummary({ coupon_state: makeCouponState({ input_code: "CONF25" }) });

    expect(screen.queryByText(/minimum cart total/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/required to use promo codes/i)).not.toBeInTheDocument();
  });

  it("enables the Add button and submits the code on a small cart", () => {
    const { onApplyCoupon } = renderSummary({
      coupon_state: makeCouponState({ input_code: "CONF25" }),
    });

    expect(addButton()).toBeEnabled();
    fireEvent.click(addButton());

    expect(onApplyCoupon).toHaveBeenCalledTimes(1);
  });

  it("submits the code with the Enter key", () => {
    const { onApplyCoupon } = renderSummary({
      coupon_state: makeCouponState({ input_code: "CONF25" }),
    });

    fireEvent.keyDown(screen.getByPlaceholderText("PROMO CODE"), { key: "Enter" });

    expect(onApplyCoupon).toHaveBeenCalledTimes(1);
  });

  it("uppercases the typed code", () => {
    const { onCouponCodeChange } = renderSummary();

    fireEvent.change(screen.getByPlaceholderText("PROMO CODE"), {
      target: { value: "conf25" },
    });

    expect(onCouponCodeChange).toHaveBeenCalledWith("CONF25");
  });

  it("disables the Add button when the input is empty", () => {
    renderSummary({ coupon_state: makeCouponState({ input_code: "   " }) });

    expect(addButton()).toBeDisabled();
  });

  it("shows a per coupon minimum error coming from the API", () => {
    renderSummary({
      coupon_state: makeCouponState({
        input_code: "BIGORDER",
        error:      "This coupon requires a minimum purchase of $1,000.00.",
      }),
    });

    expect(
      screen.getByText("This coupon requires a minimum purchase of $1,000.00.")
    ).toBeInTheDocument();
  });

  it("shows an applied coupon and the discounted total on a small cart", () => {
    const applied: AppliedCouponItem = {
      coupon_id:       "coupon-uuid",
      code:            "CONF25",
      coupon_name:     "Conference 25",
      discount_amount: 100,
      discount_type:   "percentage",
      discount_value:  25,
    };

    const { onRemoveCoupon } = renderSummary({
      coupon_state: makeCouponState({ applied_coupons: [applied] }),
    });

    expect(screen.getByText("$300.00")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /remove coupon CONF25/i }));
    expect(onRemoveCoupon).toHaveBeenCalledWith("CONF25");
  });
});
