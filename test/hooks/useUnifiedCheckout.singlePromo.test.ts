/**
 * One promo code per order at checkout (useUnifiedCheckout).
 *
 * The checkout sends the single applied promo code, and when the API rejects
 * stacked promo codes with a 422 the client sees the exact copy
 * "This promo cannot be combined with other offers."
 */

import { renderHook, act } from "@testing-library/react";
import { useUnifiedCheckout } from "@/hooks/useUnifiedCheckout";
import { PROMO_COMBINATION_ERROR_MESSAGE } from "@/lib/promo-codes";
import type { CartAppliedCoupon } from "@/types/client/unified-cart";

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
const mockCheckout = unifiedCartService.checkout as jest.MockedFunction<typeof unifiedCartService.checkout>;
const mockCheckoutDeferred = unifiedCartService.checkoutDeferred as jest.MockedFunction<
  typeof unifiedCartService.checkoutDeferred
>;

const SESSION_ID = "session-promo-1";

const save10_coupon: CartAppliedCoupon = {
  coupon_id: "save10-uuid",
  code: "SAVE10",
  coupon_name: "Save 10%",
  discount_amount: 10,
  discount_type: "percentage",
  discount_value: 10,
};

/** Laravel validation error for stacked promo codes, as thrown by the api client. */
const combination_error = {
  message: PROMO_COMBINATION_ERROR_MESSAGE,
  errors: { coupon_ids: [PROMO_COMBINATION_ERROR_MESSAGE] },
};

const billing_address = {
  address: "123 Main St",
  city: "Boise",
  country: "US",
  state: "ID",
  postal_code: "83701",
  company: "",
};

function mockCart(applied_coupons: CartAppliedCoupon[], clearCart = jest.fn()) {
  mockUseCart.mockReturnValue({
    items: [
      { cart_item_id: "1", product_type: "link_building", tier_id: "dr30", tier_name: "DR 30+", quantity: 1, unit_price: 100 },
    ],
    applied_coupons,
    total: 90,
    order_title: "",
    order_notes: "",
    clearCart,
    gift_card_reward_coupon: null,
    gift_card_reward_details: null,
  } as unknown as ReturnType<typeof useCart>);
  return clearCart;
}

describe("useUnifiedCheckout, one promo code per order", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNotifications.mockReturnValue({
      addNotification: jest.fn(),
      fetchNotifications: jest.fn(),
    } as unknown as ReturnType<typeof useNotifications>);
    mockCheckout.mockResolvedValue({
      session_id: SESSION_ID,
      orders: [{ order_id: "BL-1", product_type: "link_building", total_amount: 90 }],
    });
    mockCheckoutDeferred.mockResolvedValue({
      session_id: SESSION_ID,
      orders: [{ order_id: "BL-1", product_type: "link_building", total_amount: 90 }],
      invoice_unique_id: "inv-1",
    });
  });

  describe("card checkout", () => {
    it("sends the single applied promo code", async () => {
      mockCart([save10_coupon]);
      const { result } = renderHook(() => useUnifiedCheckout());

      await act(async () => {
        await result.current.handleComplete("pi_test", false, billing_address);
      });

      expect(mockCheckout).toHaveBeenCalledWith(expect.objectContaining({ coupon_ids: ["save10-uuid"] }));
    });

    it("omits coupon_ids when no promo code is applied", async () => {
      mockCart([]);
      const { result } = renderHook(() => useUnifiedCheckout());

      await act(async () => {
        await result.current.handleComplete("pi_test", false, billing_address);
      });

      expect(mockCheckout.mock.calls[0][0].coupon_ids).toBeUndefined();
    });

    it("shows the combination copy and keeps the cart when the API rejects stacked codes", async () => {
      const clearCart = mockCart([save10_coupon]);
      mockCheckout.mockRejectedValue(combination_error);
      const { result } = renderHook(() => useUnifiedCheckout());

      await act(async () => {
        await result.current.handleComplete("pi_test", false, billing_address);
      });

      expect(result.current.submit_error).toBe(PROMO_COMBINATION_ERROR_MESSAGE);
      expect(clearCart).not.toHaveBeenCalled();
      expect(push).not.toHaveBeenCalled();
    });
  });

  describe("pay later checkout", () => {
    it("sends the single applied promo code", async () => {
      mockCart([save10_coupon]);
      const { result } = renderHook(() => useUnifiedCheckout());

      await act(async () => {
        await result.current.handlePayLater();
      });

      expect(mockCheckoutDeferred).toHaveBeenCalledWith(expect.objectContaining({ coupon_ids: ["save10-uuid"] }));
    });

    it("shows the combination copy when the API rejects stacked codes", async () => {
      const clearCart = mockCart([save10_coupon]);
      mockCheckoutDeferred.mockRejectedValue(combination_error);
      const { result } = renderHook(() => useUnifiedCheckout());

      await act(async () => {
        await result.current.handlePayLater();
      });

      expect(result.current.submit_error).toBe(PROMO_COMBINATION_ERROR_MESSAGE);
      expect(clearCart).not.toHaveBeenCalled();
    });
  });
});
