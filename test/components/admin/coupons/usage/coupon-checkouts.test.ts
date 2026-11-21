import type { CouponCheckoutOrder, CouponUsageCheckout, CouponUsageItem } from "@/types/admin/coupons";
import {
  buildCheckoutExport,
  buildProductOrderExport,
  getOrderGiftCardAmount,
  sumUsages,
  checkoutIncludesProduct,
  countByProduct,
  describeAppliedProducts,
  groupCheckouts,
  matchesCheckoutSearch,
  sortCheckouts,
  summarizeCheckoutItems,
} from "@/components/admin/coupons/usage/coupon-usage";

function buildItem(overrides: Partial<CouponUsageItem> = {}): CouponUsageItem {
  return {
    tier_id: "dr50",
    label: "DR 50+",
    quantity: 1,
    unit_price: 400,
    subtotal: 400,
    is_coupon_applied: true,
    discount_amount: 100,
    ...overrides,
  };
}

function buildOrder(overrides: Partial<CouponCheckoutOrder> = {}): CouponCheckoutOrder {
  return {
    id: "redemption-1",
    checkout_key: "session-1",
    is_coupon_applied: true,
    order_id: "order-1",
    order_reference: "ORDER001",
    order_title: "Spring links",
    session_id: "session-1",
    product_type: "link_building",
    product_label: "Link Building",
    status: "pending",
    is_order_deleted: false,
    items: [buildItem()],
    items_quantity: 1,
    subtotal_before_discount: 400,
    discount_amount: 100,
    total_amount: 300,
    gift_card_claim: null,
    invoice: null,
    order_url: "/admin/orders/order-1",
    ordered_at: "2026-11-10T10:00:00Z",
    used_at: "2026-11-10T10:00:00Z",
    ...overrides,
  };
}

function buildCheckout(overrides: Partial<CouponUsageCheckout> = {}): CouponUsageCheckout {
  const link_building = buildOrder();
  const new_content = buildOrder({
    id: "redemption-2",
    is_coupon_applied: false,
    order_id: "order-2",
    order_reference: "ORDER002",
    product_type: "new_content",
    product_label: "New Content",
    items: [buildItem({ tier_id: "nc", label: "Basic Article", unit_price: 100, subtotal: 100, is_coupon_applied: false, discount_amount: 0 })],
    subtotal_before_discount: 100,
    discount_amount: 0,
    total_amount: 100,
  });

  return {
    id: "session-1",
    session_id: "session-1",
    reference: "SESSION1",
    title: "Spring links",
    status: "pending",
    client: { id: 7, name: "Kennedy Client", email: "kennedy@example.com", company: "Kennedy Co", organization: null },
    coupon_terms: { code: "CONF25", name: "Conference 25", discount_type: "percentage", discount_value: 25 },
    gift_card_claim: null,
    invoices: [{ id: "invoice-1", invoice_number: "INV-1001", status: "unpaid" }],
    product_types: ["link_building", "new_content"],
    applied_product_types: ["link_building"],
    order_count: 2,
    applied_order_count: 1,
    items_quantity: 2,
    applied_items_quantity: 1,
    subtotal_before_discount: 500,
    eligible_subtotal: 400,
    discount_amount: 100,
    reward_amount: 0,
    total_amount: 400,
    has_deleted_orders: false,
    is_fully_deleted: false,
    session_url: "/admin/orders/session/session-1",
    used_at: "2026-11-10T10:00:00Z",
    orders: [link_building, new_content],
    ...overrides,
  };
}

describe("coupon checkout helpers", () => {
  it("summarizes the items of every order in the checkout", () => {
    expect(summarizeCheckoutItems(buildCheckout())).toBe("2 items in 2 products");
    expect(
      summarizeCheckoutItems(buildCheckout({ orders: [buildOrder()], order_count: 1, items_quantity: 1 }))
    ).toBe("1 x DR 50+");
  });

  it("describes only the products the coupon discounted", () => {
    expect(describeAppliedProducts(buildCheckout())).toBe("Link Building");
    expect(
      describeAppliedProducts(buildCheckout({ applied_product_types: ["link_building", "new_content"] }))
    ).toBe("Link Building + New Content");
  });

  it("finds a checkout by any product bought in it, discounted or not", () => {
    const checkout = buildCheckout();

    expect(matchesCheckoutSearch(checkout, "basic article")).toBe(true);
    expect(matchesCheckoutSearch(checkout, "INV-1001")).toBe(true);
    expect(matchesCheckoutSearch(checkout, "kennedy co")).toBe(true);
    expect(matchesCheckoutSearch(checkout, "premium")).toBe(false);
    expect(checkoutIncludesProduct(checkout, "new_content")).toBe(true);
    expect(checkoutIncludesProduct(checkout, "content_brief")).toBe(false);
  });

  it("counts each checkout once per product it includes", () => {
    const counts = countByProduct([
      buildCheckout(),
      buildCheckout({ id: "session-2", product_types: ["link_building"] }),
    ]);

    expect(counts.get("link_building")).toBe(2);
    expect(counts.get("new_content")).toBe(1);
  });

  it("groups checkouts by the mix of products the coupon discounted", () => {
    const groups = groupCheckouts(
      [
        buildCheckout(),
        buildCheckout({ id: "session-2", applied_product_types: ["new_content", "link_building"] }),
        buildCheckout({ id: "session-3", applied_product_types: ["link_building", "new_content"] }),
      ],
      "product"
    );

    expect(groups.map((group) => [group.label, group.checkouts.length])).toEqual([
      ["Link Building + New Content", 2],
      ["Link Building", 1],
    ]);
  });

  it("sorts checkouts by their combined total", () => {
    const sorted = sortCheckouts(
      [buildCheckout({ id: "small", total_amount: 50 }), buildCheckout({ id: "big", total_amount: 900 })],
      "total"
    );

    expect(sorted.map((checkout) => checkout.id)).toEqual(["big", "small"]);
  });

  it("exports one row per item and flags where the promo applied", () => {
    const { headers, rows } = buildCheckoutExport([buildCheckout()], false);
    const promo_index = headers.indexOf("Promo Applied");
    const discount_index = headers.indexOf("Item Discount");

    expect(rows).toHaveLength(2);
    expect(rows[0][headers.indexOf("Item")]).toBe("DR 50+");
    expect(rows[0][promo_index]).toBe("Yes");
    expect(rows[0][discount_index]).toBe("100.00");
    expect(rows[1][headers.indexOf("Item")]).toBe("Basic Article");
    expect(rows[1][promo_index]).toBe("No");
    expect(rows[1][headers.indexOf("Checkout Total")]).toBe("400.00");
  });

  describe("gift card reward coupons, one gift card per order", () => {
    const gift_card_claim = { id: "claim-1", status: "submitted" as const, reward_amount: 50, gift_card_brand: "amazon" };

    function buildGiftCardCheckout(): CouponUsageCheckout {
      const base = buildCheckout();
      const orders = base.orders.map((order) => ({
        ...order,
        is_coupon_applied: true,
        discount_amount: 0,
        gift_card_claim,
        items: order.items.map((item) => ({ ...item, is_coupon_applied: true, discount_amount: 0 })),
      }));

      return {
        ...base,
        coupon_terms: { code: "HAPPYHOLIDAYS", name: "Happy Holidays", discount_type: "gift_card_reward", discount_value: 10 },
        gift_card_claim,
        discount_amount: 0,
        reward_amount: 50,
        orders,
      };
    }

    it("exports the order gift card once per checkout and never per item", () => {
      const { headers, rows } = buildCheckoutExport([buildGiftCardCheckout()], true);
      const gift_card_index = headers.indexOf("Order Gift Card (one per checkout)");

      expect(headers).not.toContain("Item Discount");
      expect(headers.some((header) => header.toLowerCase().includes("item gift card"))).toBe(false);
      expect(gift_card_index).toBeGreaterThan(-1);
      expect(rows).toHaveLength(2);
      expect(rows.every((row) => row[gift_card_index] === "50.00")).toBe(true);
      expect(rows.every((row) => row.length === headers.length)).toBe(true);
    });

    it("shows the shared order gift card on each product order without splitting it", () => {
      const [link_building, new_content] = buildGiftCardCheckout().orders;

      expect(getOrderGiftCardAmount(link_building)).toBe(50);
      expect(getOrderGiftCardAmount(new_content)).toBe(50);
      expect(getOrderGiftCardAmount(buildOrder())).toBe(0);
    });

    it("never adds the gift card up per product order", () => {
      const checkout = buildGiftCardCheckout();

      expect(sumUsages(checkout.orders).reward).toBe(0);
      expect(sumUsages([checkout]).reward).toBe(50);
    });

    it("labels the product order export column as a per order gift card", () => {
      const usage = { ...buildGiftCardCheckout().orders[0], client: null, coupon_terms: buildGiftCardCheckout().coupon_terms };
      const { headers, rows } = buildProductOrderExport([usage], true);
      const column = headers.findIndex((header) => header.startsWith("Order Gift Card"));

      expect(column).toBeGreaterThan(-1);
      expect(rows[0][column]).toBe("50.00");
    });
  });
});
