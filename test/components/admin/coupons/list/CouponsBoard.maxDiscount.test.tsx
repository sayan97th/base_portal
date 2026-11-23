/**
 * Admin coupons list (src/components/admin/coupons/list/CouponsBoard.tsx):
 * the per order limit is shown under the discount pill, so admins can see at
 * a glance that HAPPYHOLIDAYS gives "10% back" "Up to $1,000 per order".
 */

import React from "react";
import { render, screen, within } from "@testing-library/react";
import CouponsBoard from "@/components/admin/coupons/list/CouponsBoard";
import type { CouponGroup } from "@/components/admin/coupons/list/coupon-list";
import type { Coupon } from "@/types/admin/coupons";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

function makeCoupon(overrides: Partial<Coupon> = {}): Coupon {
  return {
    id: "coupon-1",
    code: "HAPPYHOLIDAYS",
    name: "Happy Holidays 10% Back",
    description: null,
    discount_type: "gift_card_reward",
    discount_value: 10,
    applies_to: "all",
    product_types: [],
    dr_tier_ids: [],
    dr_tiers: [],
    minimum_purchase_amount: null,
    max_discount_amount: 1000,
    starts_at: null,
    expires_at: null,
    usage_limit: null,
    usage_per_user: null,
    times_used: 3,
    is_active: true,
    is_gift_card_reward: true,
    gift_card_claims_count: 0,
    gift_card_claims_awaiting_count: 0,
    created_at: "2026-11-01T00:00:00+00:00",
    updated_at: "2026-11-01T00:00:00+00:00",
    ...overrides,
  };
}

function renderBoard(coupons: Coupon[]) {
  const groups: CouponGroup[] = [{ key: "active", label: "Active", color: "#12b76a", coupons }];

  render(
    <CouponsBoard
      groups={groups}
      show_group_headers={false}
      collapsed_keys={new Set()}
      copied_code={null}
      open_picker_id={null}
      updating_ids={new Set()}
      onToggleGroup={jest.fn()}
      onCopyCode={jest.fn()}
      onTogglePicker={jest.fn()}
      onSetActive={jest.fn()}
      onDelete={jest.fn()}
    />
  );
}

function discountCell(code: string): HTMLElement {
  const row = screen.getByText(code).closest('[role="row"]') as HTMLElement;
  return within(row).getByText((_, element) => element?.getAttribute("data-label") === "Discount");
}

describe("CouponsBoard per order limit", () => {
  it("shows the HAPPYHOLIDAYS limit under the discount", () => {
    renderBoard([makeCoupon()]);

    const cell = discountCell("HAPPYHOLIDAYS");
    expect(within(cell).getByText("10% back")).toBeInTheDocument();
    expect(within(cell).getByText("Up to $1,000 per order")).toBeInTheDocument();
  });

  it("shows the limit of a percentage coupon", () => {
    renderBoard([
      makeCoupon({ id: "coupon-2", code: "SAVE20", discount_type: "percentage", discount_value: 20, max_discount_amount: 300, is_gift_card_reward: false }),
    ]);

    expect(within(discountCell("SAVE20")).getByText("Max $300 per order")).toBeInTheDocument();
  });

  it("shows nothing extra for coupons without a limit or with a fixed amount", () => {
    renderBoard([
      makeCoupon({ id: "coupon-3", code: "UNLIMITED", max_discount_amount: null }),
      makeCoupon({ id: "coupon-4", code: "FLAT100", discount_type: "fixed_amount", discount_value: 100, max_discount_amount: 50, is_gift_card_reward: false }),
    ]);

    expect(within(discountCell("UNLIMITED")).queryByText(/per order/)).not.toBeInTheDocument();
    expect(within(discountCell("FLAT100")).queryByText(/per order/)).not.toBeInTheDocument();
  });
});
