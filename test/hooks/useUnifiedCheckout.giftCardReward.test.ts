/**
 * The gift card details collected at checkout (HAPPYHOLIDAYS) travel with the
 * checkout request so the BASE team is notified right away. They are only
 * sent when the money back promo is applied and both fields are valid.
 */

import { renderHook, act } from "@testing-library/react";
import { useUnifiedCheckout } from "@/hooks/useUnifiedCheckout";
import type { CartAppliedCoupon } from "@/types/client/unified-cart";
import type { GiftCardRewardDetails } from "@/types/client/gift-card-rewards";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
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

const reward_coupon: CartAppliedCoupon = {
  coupon_id: "holiday-uuid",
  code: "HAPPYHOLIDAYS",
  coupon_name: "Happy Holidays 10% Back",
  discount_amount: 0,
  discount_type: "gift_card_reward",
  discount_value: 10,
  is_gift_card_reward: true,
};

const billing_address = {
  address: "123 Main St",
  city: "Boise",
  country: "US",
  state: "ID",
  postal_code: "83701",
  company: "",
};

function mockCart({
  applied_coupons = [reward_coupon],
  gift_card_reward_coupon = reward_coupon,
  gift_card_reward_details = { recipient_email: "gifts@example.com", gift_card_brand: "amazon" },
}: {
  applied_coupons?: CartAppliedCoupon[];
  gift_card_reward_coupon?: CartAppliedCoupon | null;
  gift_card_reward_details?: GiftCardRewardDetails;
} = {}) {
  mockUseCart.mockReturnValue({
    items: [
      {
        cart_item_id: "1",
        product_type: "link_building",
        tier_id: "dr50",
        tier_name: "DR 50+",
        quantity: 2,
        unit_price: 400,
      },
    ],
    applied_coupons,
    total: 800,
    order_title: "",
    order_notes: "",
    clearCart: jest.fn(),
    gift_card_reward_coupon,
    gift_card_reward_details,
  } as unknown as ReturnType<typeof useCart>);
}

async function completeCardCheckout(payment_intent_id = "pi_test") {
  const { result } = renderHook(() => useUnifiedCheckout());
  await act(async () => {
    await result.current.handleComplete(payment_intent_id, false, billing_address);
  });
  return mockCheckout.mock.calls[0]?.[0];
}

async function completePayLater() {
  const { result } = renderHook(() => useUnifiedCheckout());
  await act(async () => {
    await result.current.handlePayLater();
  });
  return mockCheckoutDeferred.mock.calls[0]?.[0];
}

describe("useUnifiedCheckout gift card reward payload", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNotifications.mockReturnValue({
      addNotification: jest.fn(),
      fetchNotifications: jest.fn(),
    } as unknown as ReturnType<typeof useNotifications>);
    mockCheckout.mockResolvedValue({
      session_id: "session-1",
      orders: [{ order_id: "order-1", product_type: "link_building", total_amount: 800 }],
    });
    mockCheckoutDeferred.mockResolvedValue({
      session_id: "session-1",
      orders: [{ order_id: "order-1", product_type: "link_building", total_amount: 800 }],
      invoice_unique_id: "inv-1",
    });
  });

  it("sends the gift card details with a card checkout", async () => {
    mockCart();
    const payload = await completeCardCheckout();

    expect(payload?.coupon_ids).toEqual(["holiday-uuid"]);
    expect(payload?.gift_card_reward).toEqual({ recipient_email: "gifts@example.com", gift_card_brand: "amazon" });
  });

  it("sends the gift card details with a pay later checkout", async () => {
    mockCart({ gift_card_reward_details: { recipient_email: "billing@example.com", gift_card_brand: "target" } });
    const payload = await completePayLater();

    expect(payload?.gift_card_reward).toEqual({ recipient_email: "billing@example.com", gift_card_brand: "target" });
  });

  it("trims the email before sending it", async () => {
    mockCart({ gift_card_reward_details: { recipient_email: "  gifts@example.com  ", gift_card_brand: "visa" } });
    const payload = await completeCardCheckout();

    expect(payload?.gift_card_reward?.recipient_email).toBe("gifts@example.com");
  });

  it("omits the details when the client skipped the form", async () => {
    mockCart({ gift_card_reward_details: { recipient_email: "", gift_card_brand: "" } });
    const payload = await completeCardCheckout();

    expect(payload?.coupon_ids).toEqual(["holiday-uuid"]);
    expect(payload?.gift_card_reward).toBeUndefined();
  });

  it("omits the details while they are incomplete or invalid", async () => {
    mockCart({ gift_card_reward_details: { recipient_email: "not-an-email", gift_card_brand: "visa" } });
    const payload = await completePayLater();

    expect(payload?.gift_card_reward).toBeUndefined();
  });

  it("omits the details when no money back promo is applied", async () => {
    mockCart({ applied_coupons: [], gift_card_reward_coupon: null });
    const payload = await completeCardCheckout();

    expect(payload?.coupon_ids).toBeUndefined();
    expect(payload?.gift_card_reward).toBeUndefined();
  });

  it("omits the details when paying with credits, since no promo code is sent", async () => {
    mockCart();
    const payload = await completeCardCheckout("credits_abc");

    expect(payload?.coupon_ids).toBeUndefined();
    expect(payload?.gift_card_reward).toBeUndefined();
  });
});
