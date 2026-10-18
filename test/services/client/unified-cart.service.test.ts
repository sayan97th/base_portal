/**
 * Unit tests for the client unified-cart service.
 *
 * Regression coverage: verifies that `checkoutDeferred` correctly forwards
 * the full payload — including `coupon_ids` — to the backend. A bug previously
 * caused the discount to be removed from the invoice when a client chose
 * "Pay Later" after applying a promo code.
 */

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get:    jest.fn(),
    post:   jest.fn(),
    put:    jest.fn(),
    delete: jest.fn(),
  },
}));

import { apiClient } from "@/lib/api-client";
import { unifiedCartService } from "@/services/client/unified-cart.service";
import type { UnifiedDeferredCheckoutPayload } from "@/types/client/unified-cart";

const mocked = apiClient as jest.Mocked<typeof apiClient>;

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── checkoutDeferred ─────────────────────────────────────────────────────────

describe("unifiedCartService.checkoutDeferred", () => {
  const session_id = "550e8400-e29b-41d4-a716-446655440000";

  const base_lb_item = {
    dr_tier_id:  "dr30",
    quantity:    2,
    unit_price:  200.0,
    placements: [
      { row_index: 0, keyword: "test keyword", landing_page: "https://example.com", exact_match: false },
    ],
  };

  it("POSTs to the deferred checkout endpoint", async () => {
    mocked.post.mockResolvedValueOnce({
      data: { orders: [], session_id },
    } as never);

    const payload: UnifiedDeferredCheckoutPayload = {
      deferred_payment:     true,
      total_amount:         400.0,
      session_id,
      link_building_items:  [base_lb_item],
    };

    await unifiedCartService.checkoutDeferred(payload);

    expect(mocked.post).toHaveBeenCalledWith(
      "/api/cart/checkout/deferred",
      payload
    );
  });

  it("includes coupon_ids in the payload when coupons are applied", async () => {
    mocked.post.mockResolvedValueOnce({
      data: { orders: [{ product_type: "link_building", order_id: "order-1", total_amount: 360.0 }], session_id },
    } as never);

    const coupon_id = "coupon-uuid-1234-5678-abcd";

    const payload: UnifiedDeferredCheckoutPayload = {
      deferred_payment:    true,
      total_amount:        360.0,  // $400 - 10% coupon = $360
      session_id,
      coupon_ids:          [coupon_id],
      link_building_items: [base_lb_item],
    };

    await unifiedCartService.checkoutDeferred(payload);

    const [endpoint, sent_payload] = mocked.post.mock.calls[0] as [string, UnifiedDeferredCheckoutPayload];
    expect(endpoint).toBe("/api/cart/checkout/deferred");
    expect(sent_payload.coupon_ids).toEqual([coupon_id]);
  });

  it("forwards the discounted total_amount, not the original subtotal", async () => {
    mocked.post.mockResolvedValueOnce({
      data: { orders: [], session_id },
    } as never);

    const payload: UnifiedDeferredCheckoutPayload = {
      deferred_payment:    true,
      total_amount:        900.0,  // 1000 - 10% = 900
      session_id,
      coupon_ids:          ["coupon-abc"],
      link_building_items: [{ ...base_lb_item, quantity: 5, unit_price: 200.0 }],
    };

    await unifiedCartService.checkoutDeferred(payload);

    const [, sent_payload] = mocked.post.mock.calls[0] as [string, UnifiedDeferredCheckoutPayload];
    expect(sent_payload.total_amount).toBe(900.0);
  });

  it("sends undefined coupon_ids when no coupons are applied", async () => {
    mocked.post.mockResolvedValueOnce({
      data: { orders: [], session_id },
    } as never);

    const payload: UnifiedDeferredCheckoutPayload = {
      deferred_payment:    true,
      total_amount:        400.0,
      session_id,
      link_building_items: [base_lb_item],
    };

    await unifiedCartService.checkoutDeferred(payload);

    const [, sent_payload] = mocked.post.mock.calls[0] as [string, UnifiedDeferredCheckoutPayload];
    expect(sent_payload.coupon_ids).toBeUndefined();
  });

  it("forwards multiple coupon IDs unchanged", async () => {
    mocked.post.mockResolvedValueOnce({
      data: { orders: [], session_id },
    } as never);

    const coupon_ids = ["coupon-aaa", "coupon-bbb"];

    const payload: UnifiedDeferredCheckoutPayload = {
      deferred_payment:    true,
      total_amount:        720.0,
      session_id,
      coupon_ids,
      link_building_items: [base_lb_item],
    };

    await unifiedCartService.checkoutDeferred(payload);

    const [, sent_payload] = mocked.post.mock.calls[0] as [string, UnifiedDeferredCheckoutPayload];
    expect(sent_payload.coupon_ids).toEqual(coupon_ids);
  });

  it("returns the order list and session_id from the API response", async () => {
    const api_response = {
      data: {
        orders: [
          { product_type: "link_building", order_id: "lb-order-1", total_amount: 360.0 },
        ],
        session_id,
      },
    };

    mocked.post.mockResolvedValueOnce(api_response as never);

    const result = await unifiedCartService.checkoutDeferred({
      deferred_payment:    true,
      total_amount:        360.0,
      session_id,
      coupon_ids:          ["coupon-uuid"],
      link_building_items: [base_lb_item],
    });

    expect(result.orders).toHaveLength(1);
    expect(result.orders[0].total_amount).toBe(360.0);
    expect(result.session_id).toBe(session_id);
  });

  it("forwards deferred_payment: true in every call", async () => {
    mocked.post.mockResolvedValueOnce({
      data: { orders: [], session_id },
    } as never);

    await unifiedCartService.checkoutDeferred({
      deferred_payment:    true,
      total_amount:        200.0,
      link_building_items: [base_lb_item],
    });

    const [, sent_payload] = mocked.post.mock.calls[0] as [string, UnifiedDeferredCheckoutPayload];
    expect(sent_payload.deferred_payment).toBe(true);
  });

  it("forwards order_title and order_notes when provided", async () => {
    mocked.post.mockResolvedValueOnce({
      data: { orders: [], session_id },
    } as never);

    const payload: UnifiedDeferredCheckoutPayload = {
      deferred_payment:    true,
      total_amount:        400.0,
      session_id,
      order_title:         "Q2 Campaign",
      order_notes:         "Rush order — due by Friday",
      link_building_items: [base_lb_item],
    };

    await unifiedCartService.checkoutDeferred(payload);

    const [, sent_payload] = mocked.post.mock.calls[0] as [string, UnifiedDeferredCheckoutPayload];
    expect(sent_payload.order_title).toBe("Q2 Campaign");
    expect(sent_payload.order_notes).toBe("Rush order — due by Friday");
  });
});
