/**
 * Orchestration tests for the SEO Dashboard's "browse all products" cart flow.
 *
 * This flow reimplements its own keywords step instead of reusing
 * UnifiedIntakeStep, so it historically lacked the "Skip for now" /
 * defer-details shortcut those other flows (LinkBuildingPage, PublicOrderPage)
 * offer. A client whose only entry point was this dashboard flow could not
 * defer their intake details and complete a purchase — these tests guard
 * against that regressing again.
 *
 * Child step components (DrTierCard, KeywordEntryStep, CheckoutStep,
 * UnifiedCartSummary) are stubbed out — they have their own dedicated test
 * coverage — so these tests focus on the step wiring and the defer-details
 * flag DashboardProducts itself is responsible for.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import DashboardProducts from "@/components/seo-dashboard/DashboardProducts";
import type { CartItem, CartProductType } from "@/types/client/unified-cart";
import type { DrTier } from "@/types/client/link-building";

// ─── Module mocks ────────────────────────────────────────────────────────────

jest.mock("@/context/CartContext", () => ({
  useCart: jest.fn(),
}));

jest.mock("@/hooks/useBillingAddress", () => ({
  useBillingAddress: () => ({ saved_billing_address: null, has_saved_address: false, is_loading: false }),
}));

const handleComplete = jest.fn();
const handlePayLater = jest.fn();

jest.mock("@/hooks/useUnifiedCheckout", () => ({
  useUnifiedCheckout: () => ({
    is_submitting: false,
    submit_error: null,
    setSubmitError: jest.fn(),
    handleComplete,
    handlePayLater,
  }),
}));

jest.mock("@/lib/stripe", () => ({
  getStripe: () => null,
}));

jest.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mock_dr_tier: DrTier = {
  id: "dr40",
  label: "DR 40+",
  price_per_link: 130,
  is_active: true,
} as DrTier;

jest.mock("@/services/client/link-building.service", () => ({
  linkBuildingService: { fetchDrTiers: jest.fn(() => Promise.resolve([mock_dr_tier])) },
}));
jest.mock("@/services/client/new-content.service", () => ({
  newContentService: { fetchNewContentTiers: jest.fn(() => Promise.resolve([])) },
}));
jest.mock("@/services/client/content-optimization.service", () => ({
  contentOptimizationService: { fetchTiers: jest.fn(() => Promise.resolve([])) },
}));
jest.mock("@/services/client/content-briefs.service", () => ({
  contentBriefsService: { fetchTiers: jest.fn(() => Promise.resolve([])) },
}));

jest.mock("@/components/link-building/DrTierCard", () => {
  const MockDrTierCard = () => <div data-testid="dr-tier-card" />;
  MockDrTierCard.displayName = "MockDrTierCard";
  return MockDrTierCard;
});

jest.mock("@/components/link-building/KeywordEntryStep", () => {
  const MockKeywordEntryStep = () => <div data-testid="keyword-entry-step" />;
  MockKeywordEntryStep.displayName = "MockKeywordEntryStep";
  return MockKeywordEntryStep;
});

jest.mock("@/components/shared/UnifiedCartSummary", () => {
  const MockUnifiedCartSummary = (props: {
    action_label?: string;
    onAction?: () => void;
    is_action_disabled?: boolean;
    checkout_action?: { onSubmit: () => void };
  }) => (
    <div data-testid="cart-summary">
      {props.onAction && (
        <button onClick={props.onAction} disabled={props.is_action_disabled}>
          {props.action_label}
        </button>
      )}
      {props.checkout_action && (
        <button onClick={props.checkout_action.onSubmit}>SubmitCheckout</button>
      )}
    </div>
  );
  MockUnifiedCartSummary.displayName = "MockUnifiedCartSummary";
  return MockUnifiedCartSummary;
});

jest.mock("@/components/shared/CheckoutStep", () => {
  const ReactActual = require("react");
  const MockCheckoutStep = ReactActual.forwardRef(
    (
      props: {
        onComplete?: (id: string, saved: boolean) => void;
        onPayLater?: () => void;
      },
      ref: React.Ref<{ triggerSubmit: () => void }>
    ) => {
      ReactActual.useImperativeHandle(ref, () => ({
        triggerSubmit: () => props.onComplete?.("pi_123", false),
      }));
      return (
        <div data-testid="checkout-step">
          <button onClick={() => props.onPayLater?.()}>MockPayLater</button>
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
    tier_id: "dr40",
    tier_name: "DR 40+",
    quantity: 2,
    unit_price: 130,
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

async function renderAtKeywordsStep() {
  mockUseCart.mockReturnValue(
    buildCartContext({
      items: [makeCartItem()],
      item_count: 2,
      total: 260,
      getQuantitiesForProductType: jest.fn(
        (product_type: CartProductType): Record<string, number> =>
          product_type === "link_building" ? { dr40: 2 } : {}
      ),
    })
  );

  render(<DashboardProducts />);

  const continue_button = await screen.findByText("Continue to Keywords");
  fireEvent.click(continue_button);

  await waitFor(() => expect(screen.getByTestId("keyword-entry-step")).toBeInTheDocument());
}

describe("DashboardProducts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
  });

  it("shows the Skip for now shortcut on the keywords step", async () => {
    await renderAtKeywordsStep();

    expect(screen.getByRole("button", { name: /Skip for now/i })).toBeInTheDocument();
    expect(screen.getByText(/Pending Details/)).toBeInTheDocument();
  });

  it("jumps straight to checkout when Skip for now is clicked, bypassing keyword validation", async () => {
    await renderAtKeywordsStep();

    fireEvent.click(screen.getByRole("button", { name: /Skip for now/i }));

    await waitFor(() => expect(screen.getByTestId("checkout-step")).toBeInTheDocument());
    expect(
      screen.queryByText("Please fill in the keyword and landing page for every row before continuing.")
    ).not.toBeInTheDocument();
  });

  it("submits the deferred-details flag through to checkout after Skip for now", async () => {
    await renderAtKeywordsStep();

    fireEvent.click(screen.getByRole("button", { name: /Skip for now/i }));
    await waitFor(() => expect(screen.getByTestId("checkout-step")).toBeInTheDocument());

    fireEvent.click(screen.getByText("SubmitCheckout"));

    expect(handleComplete).toHaveBeenCalledWith(
      "pi_123",
      false,
      expect.anything(),
      undefined,
      true
    );
  });

  it("does not defer details when the user completes the keywords form normally", async () => {
    mockUseCart.mockReturnValue(
      buildCartContext({
        items: [makeCartItem()],
        item_count: 2,
        total: 260,
        getQuantitiesForProductType: jest.fn(
          (product_type: CartProductType): Record<string, number> =>
            product_type === "link_building" ? { dr40: 2 } : {}
        ),
        getKeywordDataForTier: jest.fn().mockReturnValue([
          { keyword: "seo tips", landing_page: "https://example.com/a", exact_match: false },
          { keyword: "link building", landing_page: "https://example.com/b", exact_match: false },
        ]),
      })
    );

    render(<DashboardProducts />);

    fireEvent.click(await screen.findByText("Continue to Keywords"));
    await waitFor(() => expect(screen.getByTestId("keyword-entry-step")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Continue to Checkout"));
    await waitFor(() => expect(screen.getByTestId("checkout-step")).toBeInTheDocument());

    fireEvent.click(screen.getByText("SubmitCheckout"));

    expect(handleComplete).toHaveBeenCalledWith("pi_123", false, expect.anything(), undefined, false);
  });
});
