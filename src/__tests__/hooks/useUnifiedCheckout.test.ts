/**
 * Regression coverage for the success-redirect override added to
 * useUnifiedCheckout for the public guest checkout wizard. A real bug was
 * caught during manual verification: the public flow originally redirected
 * to a route that doesn't exist (`/dashboard`). These tests lock in that the
 * default behavior (used by every existing authenticated product page) is
 * unchanged, and that a caller-supplied override is honored.
 */

import { renderHook, act } from "@testing-library/react";
import { useUnifiedCheckout } from "@/hooks/useUnifiedCheckout";

const push = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

jest.mock("@/context/CartContext", () => ({
  useCart: jest.fn(),
}));

jest.mock("@/context/NotificationsContext", () => ({
  useNotifications: jest.fn(),
}));

jest.mock("@/services/client/unified-cart.service", () => ({
  unifiedCartService: {
    checkout: jest.fn(),
    checkoutDeferred: jest.fn(),
  },
}));

jest.mock("@/lib/checkout-session", () => ({
  savePurchaseGroup: jest.fn(),
}));

jest.mock("@/services/client/purchase-groups.service", () => ({
  purchaseGroupsService: {
    createPurchaseGroup: jest.fn().mockResolvedValue(undefined),
  },
}));

import { useCart } from "@/context/CartContext";
import { useNotifications } from "@/context/NotificationsContext";
import { unifiedCartService } from "@/services/client/unified-cart.service";

const mockUseCart = useCart as jest.MockedFunction<typeof useCart>;
const mockUseNotifications = useNotifications as jest.MockedFunction<typeof useNotifications>;
const mockCheckout = unifiedCartService.checkout as jest.MockedFunction<
  typeof unifiedCartService.checkout
>;
const mockCheckoutDeferred = unifiedCartService.checkoutDeferred as jest.MockedFunction<
  typeof unifiedCartService.checkoutDeferred
>;

const SESSION_ID = "session-abc-123";

function baseCartMock(overrides: Partial<ReturnType<typeof useCart>> = {}): ReturnType<typeof useCart> {
  return {
    items: [
      {
        cart_item_id: "1",
        product_type: "link_building",
        tier_id: "dr30",
        tier_name: "DR 30+",
        quantity: 1,
        unit_price: 100,
      },
    ],
    applied_coupons: [],
    total: 100,
    order_title: "",
    order_notes: "",
    clearCart: jest.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useCart>;
}

const billing_address = {
  address: "123 Main St",
  city: "Boise",
  country: "US",
  state: "ID",
  postal_code: "83701",
  company: "",
};

describe("useUnifiedCheckout success redirect", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCart.mockReturnValue(baseCartMock());
    mockUseNotifications.mockReturnValue({ addNotification: jest.fn() } as unknown as ReturnType<
      typeof useNotifications
    >);
    mockCheckout.mockResolvedValue({
      session_id: SESSION_ID,
      orders: [{ order_id: "BL-1", product_type: "link_building", total_amount: 100 }],
    });
    mockCheckoutDeferred.mockResolvedValue({
      session_id: SESSION_ID,
      orders: [{ order_id: "BL-1", product_type: "link_building", total_amount: 100 }],
      invoice_unique_id: "inv-1",
    });
  });

  it("redirects to the order session confirmation page by default", async () => {
    const { result } = renderHook(() => useUnifiedCheckout());

    await act(async () => {
      await result.current.handleComplete("pi_test", false, billing_address);
    });

    expect(push).toHaveBeenCalledWith(`/orders/session/${SESSION_ID}`);
  });

  it("redirects to a caller-supplied path when getSuccessRedirect is provided", async () => {
    const getSuccessRedirect = (session_id: string) => `/?welcome=1&order_session=${session_id}`;
    const { result } = renderHook(() => useUnifiedCheckout(getSuccessRedirect));

    await act(async () => {
      await result.current.handleComplete("pi_test", false, billing_address);
    });

    expect(push).toHaveBeenCalledWith(`/?welcome=1&order_session=${SESSION_ID}`);
  });

  it("applies the same override to the pay-later path", async () => {
    const getSuccessRedirect = (session_id: string) => `/?welcome=1&order_session=${session_id}`;
    const { result } = renderHook(() => useUnifiedCheckout(getSuccessRedirect));

    await act(async () => {
      await result.current.handlePayLater();
    });

    expect(push).toHaveBeenCalledWith(`/?welcome=1&order_session=${SESSION_ID}`);
  });

  it("clears the cart after a successful checkout regardless of redirect target", async () => {
    const clearCart = jest.fn();
    mockUseCart.mockReturnValue(baseCartMock({ clearCart }));

    const { result } = renderHook(() => useUnifiedCheckout(() => "/anywhere"));

    await act(async () => {
      await result.current.handleComplete("pi_test", false, billing_address);
    });

    expect(clearCart).toHaveBeenCalledTimes(1);
  });
});
