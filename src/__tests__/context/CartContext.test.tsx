import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { CartProvider, useCart } from "@/context/CartContext";
import { unifiedCartService } from "@/services/client/unified-cart.service";
import { getActiveDiscounts } from "@/services/client/discounts.service";

// ─── Module mocks ────────────────────────────────────────────────────────────

jest.mock("@/services/client/unified-cart.service", () => ({
  unifiedCartService: {
    fetchCart: jest.fn(),
    saveCart: jest.fn(() => Promise.resolve()),
    deleteCart: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock("@/services/client/discounts.service", () => ({
  getActiveDiscounts: jest.fn(),
}));

const mockFetchCart = unifiedCartService.fetchCart as jest.MockedFunction<
  typeof unifiedCartService.fetchCart
>;
const mockGetActiveDiscounts = getActiveDiscounts as jest.MockedFunction<
  typeof getActiveDiscounts
>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderCart() {
  return renderHook(() => useCart(), {
    wrapper: ({ children }) => <CartProvider>{children}</CartProvider>,
  });
}

beforeEach(() => {
  localStorage.clear();
  mockFetchCart.mockResolvedValue(null);
  mockGetActiveDiscounts.mockResolvedValue([]);
});

// ─── Test suite ───────────────────────────────────────────────────────────────

describe("CartContext syncItemPrices", () => {
  it("updates the unit_price of a matching cart item when the tier price changed", async () => {
    const { result } = renderCart();

    await waitFor(() => expect(result.current.is_cart_ready).toBe(true));

    act(() => {
      result.current.setItemQuantity("link_building", "dr60", "DR 60+", 500, 2);
    });

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.items[0].unit_price).toBe(500);

    // Admin drops the price from $500 to $475 — the page re-fetches tiers and
    // reconciles the cart, exactly as LinkBuildingPage does on tier load.
    act(() => {
      result.current.syncItemPrices("link_building", { dr60: 475 });
    });

    await waitFor(() => expect(result.current.items[0].unit_price).toBe(475));
    expect(result.current.subtotal).toBe(950); // 2 * 475
  });

  it("does not touch items of a different product_type", async () => {
    const { result } = renderCart();
    await waitFor(() => expect(result.current.is_cart_ready).toBe(true));

    act(() => {
      result.current.setItemQuantity("link_building", "dr60", "DR 60+", 500, 1);
      result.current.setItemQuantity("new_content", "dr60", "Standard Article", 150, 1);
    });
    await waitFor(() => expect(result.current.items).toHaveLength(2));

    // Same tier_id string, but a different product_type — must not cross-update.
    act(() => {
      result.current.syncItemPrices("link_building", { dr60: 475 });
    });

    await waitFor(() => {
      const lb = result.current.items.find((i) => i.product_type === "link_building");
      expect(lb?.unit_price).toBe(475);
    });

    const nc = result.current.items.find((i) => i.product_type === "new_content");
    expect(nc?.unit_price).toBe(150); // untouched
  });

  it("ignores tier ids that are not present in the price map", async () => {
    const { result } = renderCart();
    await waitFor(() => expect(result.current.is_cart_ready).toBe(true));

    act(() => {
      result.current.setItemQuantity("link_building", "dr60", "DR 60+", 500, 1);
    });
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    act(() => {
      // Price map only knows about a different tier — dr60 has no current price
      // returned (e.g. it became inactive), so its cart snapshot is left alone.
      result.current.syncItemPrices("link_building", { dr30: 260 });
    });

    // No pending state change to wait for — assert it stays as-is.
    expect(result.current.items[0].unit_price).toBe(500);
  });

  it("is idempotent — calling it again with the same map is a no-op", async () => {
    const { result } = renderCart();
    await waitFor(() => expect(result.current.is_cart_ready).toBe(true));

    act(() => {
      result.current.setItemQuantity("link_building", "dr60", "DR 60+", 500, 1);
    });
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    act(() => {
      result.current.syncItemPrices("link_building", { dr60: 475 });
    });
    await waitFor(() => expect(result.current.items[0].unit_price).toBe(475));

    const items_reference = result.current.items;

    act(() => {
      result.current.syncItemPrices("link_building", { dr60: 475 });
    });

    // Same price again — the items array reference must be preserved (no
    // wasted re-render), matching the bail-out behavior relied on by the
    // reactive effect in the product pages.
    expect(result.current.items).toBe(items_reference);
  });

  it("recovers a stale price even after the cart is overwritten by a later server sync", async () => {
    // Reproduces the real-world race: the page's own tier fetch resolves and
    // corrects the price, but the CartContext's independent server cart fetch
    // resolves afterwards and re-applies the old snapshot. The fix relies on
    // callers re-invoking syncItemPrices whenever `items` changes, which this
    // test simulates directly against the context.
    let resolve_fetch_cart!: (value: Awaited<ReturnType<typeof unifiedCartService.fetchCart>>) => void;
    mockFetchCart.mockReturnValue(
      new Promise((resolve) => {
        resolve_fetch_cart = resolve;
      })
    );

    const { result } = renderCart();

    act(() => {
      result.current.setItemQuantity("link_building", "dr60", "DR 60+", 500, 1);
    });
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    // Tiers finish loading first and correct the price.
    act(() => {
      result.current.syncItemPrices("link_building", { dr60: 475 });
    });
    await waitFor(() => expect(result.current.items[0].unit_price).toBe(475));

    // The server cart fetch resolves later with the old stale snapshot,
    // clobbering the correction — this is the bug that was reported.
    act(() => {
      resolve_fetch_cart({
        items: [
          {
            cart_item_id: "server-item",
            product_type: "link_building",
            tier_id: "dr60",
            tier_name: "DR 60+",
            quantity: 1,
            unit_price: 500,
          },
        ],
        applied_coupons: [],
        coupon_input_code: "",
        order_title: "",
        order_notes: "",
      });
    });

    await waitFor(() => expect(result.current.items[0].unit_price).toBe(500));

    // A caller reacting to the `items` change (as the product pages now do)
    // re-runs the sync and self-heals.
    act(() => {
      result.current.syncItemPrices("link_building", { dr60: 475 });
    });

    await waitFor(() => expect(result.current.items[0].unit_price).toBe(475));
  });
});
