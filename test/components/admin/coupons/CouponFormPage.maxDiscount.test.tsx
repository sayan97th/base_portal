/**
 * Per order limit on the coupon create and edit pages
 * (src/components/admin/coupons/CouponFormPage.tsx, used by
 * app/(admin)/admin/coupons/new and app/(admin)/admin/coupons/[id]/edit).
 *
 * The client asked for HAPPYHOLIDAYS to give 10% back as a gift card, never
 * more than $1,000 per order. Admins set that limit with the "Maximum Gift
 * Card Value" field (or "Maximum Discount" for percentage coupons).
 */

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import CouponFormPage from "@/components/admin/coupons/CouponFormPage";
import type { Coupon } from "@/types/admin/coupons";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

jest.mock("flatpickr", () => ({
  __esModule: true,
  default: jest.fn(() => ({ destroy: jest.fn(), setDate: jest.fn() })),
}));

jest.mock("@/services/admin/coupons.service", () => ({
  createAdminCoupon: jest.fn(),
  updateAdminCoupon: jest.fn(),
  getAdminCoupon: jest.fn(),
  toggleAdminCouponStatus: jest.fn(),
}));

jest.mock("@/services/admin/link-building.service", () => ({
  listAdminDrTiers: jest.fn(() => Promise.resolve([])),
}));

import { createAdminCoupon, getAdminCoupon, updateAdminCoupon } from "@/services/admin/coupons.service";

const mock_create = createAdminCoupon as jest.MockedFunction<typeof createAdminCoupon>;
const mock_update = updateAdminCoupon as jest.MockedFunction<typeof updateAdminCoupon>;
const mock_get = getAdminCoupon as jest.MockedFunction<typeof getAdminCoupon>;

/** HAPPYHOLIDAYS as stored after the change: 10% back, never more than $1,000. */
function makeHolidayCoupon(overrides: Partial<Coupon> = {}): Coupon {
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
    starts_at: "2026-11-27",
    expires_at: "2026-12-18",
    usage_limit: null,
    usage_per_user: null,
    times_used: 0,
    is_active: true,
    is_gift_card_reward: true,
    gift_card_claims_count: 0,
    gift_card_claims_awaiting_count: 0,
    created_at: "2026-11-01T00:00:00+00:00",
    updated_at: "2026-11-01T00:00:00+00:00",
    ...overrides,
  };
}

async function renderEditPage(coupon: Coupon = makeHolidayCoupon()) {
  mock_get.mockResolvedValueOnce(coupon);
  render(<CouponFormPage mode="edit" coupon_id={coupon.id} />);
  await screen.findByRole("heading", { name: "Edit Coupon" });
}

async function renderCreatePage() {
  render(<CouponFormPage mode="create" />);
  await screen.findByRole("heading", { name: "Create New Coupon" });
  fireEvent.change(screen.getByPlaceholderText("e.g. SAVE20"), { target: { value: "BIGBACK" } });
  fireEvent.change(screen.getByPlaceholderText("e.g. Summer Sale 20% Off"), { target: { value: "Big Back" } });
}

function chooseDiscountType(label: "Percentage" | "Fixed Amount" | "Gift Card") {
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${label}$`) }));
}

function clickSave() {
  fireEvent.click(screen.getByRole("button", { name: /Save Changes/ }));
}

function clickCreate() {
  fireEvent.click(screen.getByRole("button", { name: /Create Coupon/ }));
}

beforeEach(() => {
  jest.clearAllMocks();
  window.scrollTo = jest.fn();
  mock_update.mockImplementation(async (_id, payload) => makeHolidayCoupon(payload as Partial<Coupon>));
  mock_create.mockImplementation(async (payload) => makeHolidayCoupon(payload as Partial<Coupon>));
});

// ── New Coupon page ──────────────────────────────────────────────────────────

describe("creating a coupon", () => {
  it("offers the limit for percentage coupons, switched off by default", async () => {
    await renderCreatePage();

    const toggle = screen.getByRole("button", { name: "Limit the discount" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByLabelText("Maximum discount")).toBeDisabled();
    expect(screen.getByText("No limit. The discount always grows with the order total.")).toBeInTheDocument();
  });

  it("creates the HAPPYHOLIDAYS style coupon with a $1,000 gift card limit", async () => {
    await renderCreatePage();

    chooseDiscountType("Gift Card");
    fireEvent.click(screen.getByRole("button", { name: "Limit the gift card value" }));
    fireEvent.change(screen.getByLabelText("Maximum gift card value"), { target: { value: "1000" } });
    clickCreate();

    await waitFor(() => expect(mock_create).toHaveBeenCalledTimes(1));
    expect(mock_create).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "BIGBACK",
        discount_type: "gift_card_reward",
        discount_value: 10,
        max_discount_amount: 1000,
      })
    );
  });

  it("creates a coupon without a limit when the switch stays off", async () => {
    await renderCreatePage();

    chooseDiscountType("Gift Card");
    clickCreate();

    await waitFor(() => expect(mock_create).toHaveBeenCalled());
    expect(mock_create.mock.calls[0][0]).toEqual(expect.objectContaining({ max_discount_amount: null }));
  });

  it("hides the limit for fixed amount coupons and never sends it", async () => {
    await renderCreatePage();

    fireEvent.click(screen.getByRole("button", { name: "Limit the discount" }));
    fireEvent.change(screen.getByLabelText("Maximum discount"), { target: { value: "300" } });
    chooseDiscountType("Fixed Amount");

    expect(screen.queryByLabelText("Maximum discount")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Limit the/ })).not.toBeInTheDocument();

    clickCreate();

    await waitFor(() => expect(mock_create).toHaveBeenCalled());
    expect(mock_create.mock.calls[0][0]).toEqual(expect.objectContaining({ max_discount_amount: null }));
  });

  it("asks for an amount when the switch is on but the field is empty", async () => {
    await renderCreatePage();

    chooseDiscountType("Gift Card");
    fireEvent.click(screen.getByRole("button", { name: "Limit the gift card value" }));
    clickCreate();

    expect(await screen.findByText("Enter a maximum amount greater than 0.")).toBeInTheDocument();
    expect(mock_create).not.toHaveBeenCalled();
  });

  // The input has min="0.01", so the browser blocks the submit itself before
  // the form validation runs. Either way the coupon is never sent to the API.
  it.each(["0", "-50"])("never sends %s as a limit", async (value) => {
    await renderCreatePage();

    chooseDiscountType("Gift Card");
    fireEvent.click(screen.getByRole("button", { name: "Limit the gift card value" }));
    const input = screen.getByLabelText("Maximum gift card value");
    fireEvent.change(input, { target: { value } });
    clickCreate();

    expect(input).toBeInvalid();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mock_create).not.toHaveBeenCalled();
  });

  it("clears the error as soon as the admin types an amount", async () => {
    await renderCreatePage();

    chooseDiscountType("Gift Card");
    fireEvent.click(screen.getByRole("button", { name: "Limit the gift card value" }));
    clickCreate();
    expect(await screen.findByText("Enter a maximum amount greater than 0.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Maximum gift card value"), { target: { value: "1000" } });

    expect(screen.queryByText("Enter a maximum amount greater than 0.")).not.toBeInTheDocument();
  });
});

// ── Explanations and live preview ────────────────────────────────────────────

describe("explaining the limit", () => {
  it("shows a live example of the limit on a $50,000 order", async () => {
    await renderEditPage();

    expect(
      screen.getByText(/Example: a \$50,000 order gets 10% = \$5,000, limited to a \$1,000 gift card\./)
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Clients can order as much as they want, but one order never earns a gift card worth more than this amount."
      )
    ).toBeInTheDocument();
  });

  it("updates the example when the percentage changes", async () => {
    await renderEditPage();

    fireEvent.change(screen.getByPlaceholderText("10"), { target: { value: "1" } });

    // 1% of $50,000 is $500, below the limit, so nothing is limited.
    expect(screen.getByText(/Example: a \$50,000 order gets 1% = \$500 gift card\./)).toBeInTheDocument();
  });

  it("shows the limit on the live preview card", async () => {
    await renderEditPage();

    expect(screen.getByText("Gift card up to $1,000 per order")).toBeInTheDocument();
  });

  it("removes the limit from the preview when the switch is turned off", async () => {
    await renderEditPage();

    fireEvent.click(screen.getByRole("button", { name: "Limit the gift card value" }));

    expect(screen.queryByText("Gift card up to $1,000 per order")).not.toBeInTheDocument();
    expect(screen.getByText("No limit. The gift card always grows with the order total.")).toBeInTheDocument();
  });

  it("shows a percentage coupon limit as a discount on the preview", async () => {
    await renderEditPage(
      makeHolidayCoupon({ code: "SAVE20", discount_type: "percentage", discount_value: 20, max_discount_amount: 300, is_gift_card_reward: false })
    );

    expect(screen.getByText("Up to $300 off per order")).toBeInTheDocument();
    expect(screen.getByLabelText("Maximum discount")).toHaveValue(300);
  });

  it("mentions the limit in the tips", async () => {
    await renderEditPage();

    expect(screen.getByText(/10% back up to \$1,000 sends at most \$1,000, even on a \$50,000 order\./)).toBeInTheDocument();
  });
});

// ── Edit Coupon page ─────────────────────────────────────────────────────────

describe("editing a coupon", () => {
  it("loads the saved limit with the switch on", async () => {
    await renderEditPage();

    expect(screen.getByRole("button", { name: "Limit the gift card value" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Maximum gift card value")).toHaveValue(1000);
  });

  it("loads a coupon without a limit with the switch off", async () => {
    await renderEditPage(makeHolidayCoupon({ max_discount_amount: null }));

    expect(screen.getByRole("button", { name: "Limit the gift card value" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByLabelText("Maximum gift card value")).toBeDisabled();
  });

  it("saves the limit unchanged", async () => {
    await renderEditPage();

    clickSave();

    await waitFor(() => expect(mock_update).toHaveBeenCalled());
    expect(mock_update).toHaveBeenCalledWith(
      "coupon-1",
      expect.objectContaining({ code: "HAPPYHOLIDAYS", discount_type: "gift_card_reward", max_discount_amount: 1000 })
    );
  });

  it("saves a new limit", async () => {
    await renderEditPage();

    fireEvent.change(screen.getByLabelText("Maximum gift card value"), { target: { value: "1500.50" } });
    clickSave();

    await waitFor(() => expect(mock_update).toHaveBeenCalled());
    expect(mock_update.mock.calls[0][1]).toEqual(expect.objectContaining({ max_discount_amount: 1500.5 }));
  });

  it("removes the limit when the switch is turned off", async () => {
    await renderEditPage();

    fireEvent.click(screen.getByRole("button", { name: "Limit the gift card value" }));
    expect(screen.getByLabelText("Maximum gift card value")).toHaveValue(null);
    clickSave();

    await waitFor(() => expect(mock_update).toHaveBeenCalled());
    expect(mock_update.mock.calls[0][1]).toEqual(expect.objectContaining({ max_discount_amount: null }));
  });

  it("adds a limit to a percentage coupon", async () => {
    await renderEditPage(
      makeHolidayCoupon({ code: "SAVE20", discount_type: "percentage", discount_value: 20, max_discount_amount: null, is_gift_card_reward: false })
    );

    fireEvent.click(screen.getByRole("button", { name: "Limit the discount" }));
    fireEvent.change(screen.getByLabelText("Maximum discount"), { target: { value: "300" } });
    clickSave();

    await waitFor(() => expect(mock_update).toHaveBeenCalled());
    expect(mock_update.mock.calls[0][1]).toEqual(expect.objectContaining({ max_discount_amount: 300 }));
  });

  it("drops the limit when the coupon becomes a fixed amount coupon", async () => {
    await renderEditPage();

    chooseDiscountType("Fixed Amount");
    clickSave();

    await waitFor(() => expect(mock_update).toHaveBeenCalled());
    expect(mock_update.mock.calls[0][1]).toEqual(
      expect.objectContaining({ discount_type: "fixed_amount", max_discount_amount: null })
    );
  });

  it("never sends a limit stored on a fixed amount coupon", async () => {
    await renderEditPage(
      makeHolidayCoupon({ code: "FLAT100", discount_type: "fixed_amount", discount_value: 100, max_discount_amount: 500, is_gift_card_reward: false })
    );

    expect(screen.queryByLabelText("Maximum discount")).not.toBeInTheDocument();
    clickSave();

    await waitFor(() => expect(mock_update).toHaveBeenCalled());
    expect(mock_update.mock.calls[0][1]).toEqual(expect.objectContaining({ max_discount_amount: null }));
  });

  it("keeps the limit when switching between gift card and percentage", async () => {
    await renderEditPage();

    chooseDiscountType("Percentage");
    expect(screen.getByLabelText("Maximum discount")).toHaveValue(1000);
    clickSave();

    await waitFor(() => expect(mock_update).toHaveBeenCalled());
    expect(mock_update.mock.calls[0][1]).toEqual(
      expect.objectContaining({ discount_type: "percentage", max_discount_amount: 1000 })
    );
  });

  it("shows the server error when the API rejects the limit", async () => {
    mock_update.mockRejectedValueOnce({ message: "The maximum amount must be greater than 0." });
    await renderEditPage();

    clickSave();

    expect(await screen.findByText("The maximum amount must be greater than 0.")).toBeInTheDocument();
  });
});
