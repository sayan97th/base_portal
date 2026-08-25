/**
 * Orchestration tests for the public guest checkout wizard. Child step
 * components (UnifiedIntakeStep, OrderReviewStep, PublicAccountStep,
 * CheckoutStep, PublicOrderSummary) are stubbed out — they have their own
 * dedicated test coverage — so these tests focus purely on what
 * PublicOrderPage itself is responsible for: hydrating the cart from the
 * `cart` link param, picking the right first step, and wiring the step
 * transitions together correctly.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PublicOrderPage from "@/components/order/PublicOrderPage";
import { encodePublicOrderCart } from "@/lib/public-order-link";
import type { CartItem } from "@/types/client/unified-cart";

// ─── Module mocks ────────────────────────────────────────────────────────────

let search_params_value = "";

jest.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: (key: string) => (key === "cart" ? search_params_value || null : null),
  }),
}));

jest.mock("@/context/CartContext", () => ({
  useCart: jest.fn(),
}));

jest.mock("@/hooks/useBillingAddress", () => ({
  useBillingAddress: () => ({ saved_billing_address: null, has_saved_address: false, is_loading: false }),
}));

jest.mock("@/hooks/useUnifiedCheckout", () => ({
  useUnifiedCheckout: () => ({
    is_submitting: false,
    submit_error: null,
    setSubmitError: jest.fn(),
    handleComplete: jest.fn(),
    handlePayLater: jest.fn(),
  }),
}));

jest.mock("@/lib/stripe", () => ({
  getStripe: () => null,
}));

jest.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/components/shared/UnifiedIntakeStep", () => {
  const MockUnifiedIntakeStep = (props: {
    onNext: () => void;
    onSkip?: () => void;
    onBack: () => void;
  }) => (
    <div data-testid="intake-step">
      <button onClick={props.onNext}>MockIntakeNext</button>
      <button onClick={props.onSkip}>MockIntakeSkip</button>
      <button onClick={props.onBack}>MockIntakeBack</button>
    </div>
  );
  MockUnifiedIntakeStep.displayName = "MockUnifiedIntakeStep";
  return MockUnifiedIntakeStep;
});

jest.mock("@/components/shared/OrderReviewStep", () => {
  const MockOrderReviewStep = (props: { onNext: () => void; onBack: () => void }) => (
    <div data-testid="review-step">
      <button onClick={props.onNext}>MockReviewNext</button>
      <button onClick={props.onBack}>MockReviewBack</button>
    </div>
  );
  MockOrderReviewStep.displayName = "MockOrderReviewStep";
  return MockOrderReviewStep;
});

jest.mock("@/components/order/PublicAccountStep", () => {
  const MockPublicAccountStep = (props: { onNext: () => void; onBack: () => void }) => (
    <div data-testid="account-step">
      <button onClick={props.onNext}>MockAccountNext</button>
      <button onClick={props.onBack}>MockAccountBack</button>
    </div>
  );
  MockPublicAccountStep.displayName = "MockPublicAccountStep";
  return MockPublicAccountStep;
});

jest.mock("@/components/order/PublicOrderSummary", () => {
  const MockPublicOrderSummary = () => <div data-testid="order-summary" />;
  MockPublicOrderSummary.displayName = "MockPublicOrderSummary";
  return MockPublicOrderSummary;
});

const triggerSubmit = jest.fn();

jest.mock("@/components/shared/CheckoutStep", () => {
  const React = require("react");
  const MockCheckoutStep = React.forwardRef(
    (
      props: { onPayLaterSelectionChange?: (is_pay_later_selected: boolean) => void },
      ref: React.Ref<{ triggerSubmit: () => void }>
    ) => {
      React.useImperativeHandle(ref, () => ({ triggerSubmit }));
      return (
        <div data-testid="checkout-step">
          <button type="button" onClick={() => props.onPayLaterSelectionChange?.(true)}>
            MockSelectPayLater
          </button>
        </div>
      );
    }
  );
  MockCheckoutStep.displayName = "MockCheckoutStep";
  return { __esModule: true, default: MockCheckoutStep };
});

import { useCart } from "@/context/CartContext";

const mockUseCart = useCart as jest.MockedFunction<typeof useCart>;

function makeCartItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    cart_item_id: "item-1",
    product_type: "link_building",
    tier_id: "dr30",
    tier_name: "DR 30+",
    quantity: 2,
    unit_price: 100,
    ...overrides,
  };
}

function buildCartContext(overrides: Partial<ReturnType<typeof useCart>> = {}): ReturnType<typeof useCart> {
  return {
    items: [],
    applied_coupons: [],
    coupon_input_code: "",
    order_title: "",
    order_notes: "",
    is_cart_ready: true,
    subtotal: 0,
    link_building_subtotal: 0,
    total_links: 0,
    bulk_discount_amount: 0,
    bulk_discount_details: [],
    subtotal_after_bulk: 0,
    total_discount: 0,
    effective_discount_amount: 0,
    active_discount_type: "none",
    total: 0,
    item_count: 0,
    bulk_discount_configs: [],
    coupon_adjustment_notice: null,
    setItemQuantity: jest.fn(),
    updateLinkBuildingKeywords: jest.fn(),
    updateNewContentIntakeData: jest.fn(),
    getIntakeDataForTier: jest.fn().mockReturnValue([]),
    updateContentOptimizationIntakeData: jest.fn(),
    getContentOptimizationIntakeDataForTier: jest.fn().mockReturnValue([]),
    updateContentBriefIntakeData: jest.fn(),
    getContentBriefIntakeDataForTier: jest.fn().mockReturnValue([]),
    clearCart: jest.fn(),
    setAppliedCoupons: jest.fn(),
    setCouponInputCode: jest.fn(),
    setOrderTitle: jest.fn(),
    setOrderNotes: jest.fn(),
    getQuantitiesForProductType: jest.fn().mockReturnValue({}),
    getKeywordDataForTier: jest.fn().mockReturnValue([]),
    setCouponAdjustmentNotice: jest.fn(),
    ...overrides,
  } as ReturnType<typeof useCart>;
}

describe("PublicOrderPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    search_params_value = "";
    window.scrollTo = jest.fn();
  });

  it("shows an empty-order message and a link back to the marketing site when the cart is empty", () => {
    mockUseCart.mockReturnValue(buildCartContext({ is_cart_ready: true, items: [], item_count: 0 }));
    render(<PublicOrderPage />);

    expect(screen.getByText("Your order link is invalid or has expired")).toBeInTheDocument();
    expect(screen.getByText("Back to basesearchmarketing.com").closest("a")).toHaveAttribute(
      "href",
      "https://basesearchmarketing.com"
    );
  });

  it("hydrates the cart from the `cart` query param on mount", () => {
    const set_item_quantity = jest.fn();
    const clear_cart = jest.fn();
    search_params_value = encodePublicOrderCart([
      { product_type: "link_building", tier_id: "dr40", tier_name: "DR 40+", unit_price: 130, quantity: 2 },
    ]);
    mockUseCart.mockReturnValue(
      buildCartContext({
        is_cart_ready: true,
        items: [],
        item_count: 0,
        setItemQuantity: set_item_quantity,
        clearCart: clear_cart,
      })
    );

    render(<PublicOrderPage />);

    expect(set_item_quantity).toHaveBeenCalledWith("link_building", "dr40", "DR 40+", 130, 2);
  });

  it("clears any pre-existing cart before hydrating from the link, so a stale local/server cart can't carry extra items into checkout", () => {
    const call_order: string[] = [];
    const clear_cart = jest.fn(() => call_order.push("clearCart"));
    const set_item_quantity = jest.fn(() => call_order.push("setItemQuantity"));

    search_params_value = encodePublicOrderCart([
      { product_type: "link_building", tier_id: "dr40", tier_name: "DR 40+", unit_price: 130, quantity: 2 },
    ]);

    // Simulate a leftover cart already sitting in the shared CartContext
    // (e.g. a stale localStorage snapshot, or a previously logged-in
    // account's saved server cart) at the moment this page hydrates.
    mockUseCart.mockReturnValue(
      buildCartContext({
        is_cart_ready: true,
        items: [makeCartItem({ tier_id: "stale-tier" })],
        item_count: 5,
        setItemQuantity: set_item_quantity,
        clearCart: clear_cart,
      })
    );

    render(<PublicOrderPage />);

    expect(clear_cart).toHaveBeenCalledTimes(1);
    expect(set_item_quantity).toHaveBeenCalledWith("link_building", "dr40", "DR 40+", 130, 2);
    expect(call_order).toEqual(["clearCart", "setItemQuantity"]);
  });

  it("lands on the intake step when the cart has an item that needs intake details", () => {
    mockUseCart.mockReturnValue(
      buildCartContext({ items: [makeCartItem()], item_count: 2, total: 200 })
    );
    render(<PublicOrderPage />);

    expect(screen.getByTestId("intake-step")).toBeInTheDocument();
  });

  it("walks intake -> review -> account -> checkout via each step's onNext callback", async () => {
    mockUseCart.mockReturnValue(
      buildCartContext({ items: [makeCartItem()], item_count: 2, total: 200 })
    );
    render(<PublicOrderPage />);

    expect(screen.getByTestId("intake-step")).toBeInTheDocument();

    fireEvent.click(screen.getByText("MockIntakeNext"));
    await waitFor(() => expect(screen.getByTestId("review-step")).toBeInTheDocument());

    fireEvent.click(screen.getByText("MockReviewNext"));
    await waitFor(() => expect(screen.getByTestId("account-step")).toBeInTheDocument());

    fireEvent.click(screen.getByText("MockAccountNext"));
    await waitFor(() => expect(screen.getByTestId("checkout-step")).toBeInTheDocument());
  });

  it("jumps straight from intake to account when the user clicks Skip for now", async () => {
    mockUseCart.mockReturnValue(
      buildCartContext({ items: [makeCartItem()], item_count: 2, total: 200 })
    );
    render(<PublicOrderPage />);

    fireEvent.click(screen.getByText("MockIntakeSkip"));
    await waitFor(() => expect(screen.getByTestId("account-step")).toBeInTheDocument());
  });

  it("renders a Pay button on the checkout step that triggers the checkout submit handle", async () => {
    mockUseCart.mockReturnValue(
      buildCartContext({ items: [makeCartItem()], item_count: 2, total: 200 })
    );
    render(<PublicOrderPage />);

    fireEvent.click(screen.getByText("MockIntakeNext"));
    await waitFor(() => screen.getByTestId("review-step"));
    fireEvent.click(screen.getByText("MockReviewNext"));
    await waitFor(() => screen.getByTestId("account-step"));
    fireEvent.click(screen.getByText("MockAccountNext"));
    await waitFor(() => screen.getByTestId("checkout-step"));

    fireEvent.click(screen.getByText("Pay $200.00"));
    expect(triggerSubmit).toHaveBeenCalledTimes(1);
  });

  it("relabels the submit button to Request Invoice once the Pay Later method is selected", async () => {
    mockUseCart.mockReturnValue(
      buildCartContext({ items: [makeCartItem()], item_count: 2, total: 200 })
    );
    render(<PublicOrderPage />);

    fireEvent.click(screen.getByText("MockIntakeNext"));
    await waitFor(() => screen.getByTestId("review-step"));
    fireEvent.click(screen.getByText("MockReviewNext"));
    await waitFor(() => screen.getByTestId("account-step"));
    fireEvent.click(screen.getByText("MockAccountNext"));
    await waitFor(() => screen.getByTestId("checkout-step"));

    expect(screen.getByText("Pay $200.00")).toBeInTheDocument();

    fireEvent.click(screen.getByText("MockSelectPayLater"));

    expect(screen.getByText("Request Invoice")).toBeInTheDocument();
    expect(screen.queryByText("Pay $200.00")).not.toBeInTheDocument();
  });
});
