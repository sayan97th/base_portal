/**
 * Tests for the coupon create and edit page (src/components/admin/coupons/CouponFormPage.tsx).
 *
 * Regression coverage for "At least one DR tier must be selected." shown when
 * saving a coupon whose discount scope is not DR Tiers, and for the instant
 * status control that must disable a coupon even while the form has errors.
 */

import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import CouponFormPage from "@/components/admin/coupons/CouponFormPage";
import type { Coupon } from "@/types/admin/coupons";
import type { AdminDrTier } from "@/types/admin/link-building";

const mock_push = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mock_push }),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// The date picker library needs a real layout engine, a stub is enough here.
jest.mock("flatpickr", () => ({
  __esModule: true,
  default: jest.fn(() => ({ destroy: jest.fn(), setDate: jest.fn() })),
}));

jest.mock("@/components/admin/coupons/CouponGiftCardClaimsBoard", () => ({
  __esModule: true,
  default: () => <div data-testid="gift-card-claims-board" />,
}));

jest.mock("@/services/admin/coupons.service", () => ({
  createAdminCoupon: jest.fn(),
  updateAdminCoupon: jest.fn(),
  getAdminCoupon: jest.fn(),
  toggleAdminCouponStatus: jest.fn(),
}));

jest.mock("@/services/admin/link-building.service", () => ({
  listAdminDrTiers: jest.fn(),
}));

import {
  createAdminCoupon,
  getAdminCoupon,
  toggleAdminCouponStatus,
  updateAdminCoupon,
} from "@/services/admin/coupons.service";
import { listAdminDrTiers } from "@/services/admin/link-building.service";

const mock_create = createAdminCoupon as jest.MockedFunction<typeof createAdminCoupon>;
const mock_update = updateAdminCoupon as jest.MockedFunction<typeof updateAdminCoupon>;
const mock_get = getAdminCoupon as jest.MockedFunction<typeof getAdminCoupon>;
const mock_toggle = toggleAdminCouponStatus as jest.MockedFunction<typeof toggleAdminCouponStatus>;
const mock_list_tiers = listAdminDrTiers as jest.MockedFunction<typeof listAdminDrTiers>;

function makeTier(overrides: Partial<AdminDrTier> = {}): AdminDrTier {
  return {
    id: "dr50",
    label: "DR 50+",
    traffic_range: "10k-20k",
    word_count: 500,
    price_per_link: 400,
    is_most_popular: false,
    is_active: true,
    is_hidden: false,
    orders_count: 0,
    revenue_total: 0,
    created_at: "2026-01-01T00:00:00+00:00",
    updated_at: "2026-01-01T00:00:00+00:00",
    ...overrides,
  };
}

/** The coupon from the bug report: fixed $100 off, minimum purchase of $800. */
function makeCoupon(overrides: Partial<Coupon> = {}): Coupon {
  return {
    id: "coupon-1",
    code: "TESTLAUNCH100",
    name: "Test Launch Special",
    description: "$100 off flat, testing high value fixed discount.",
    discount_type: "fixed_amount",
    discount_value: 100,
    applies_to: "minimum_purchase",
    product_types: [],
    dr_tier_ids: [],
    dr_tiers: [],
    minimum_purchase_amount: 800,
    starts_at: null,
    expires_at: "2027-07-18",
    usage_limit: 50,
    usage_per_user: null,
    times_used: 0,
    is_active: true,
    created_at: "2026-11-01T00:00:00+00:00",
    updated_at: "2026-11-01T00:00:00+00:00",
    ...overrides,
  };
}

async function renderEditPage(coupon: Coupon = makeCoupon()) {
  mock_get.mockResolvedValueOnce(coupon);
  render(<CouponFormPage mode="edit" coupon_id={coupon.id} />);
  await screen.findByRole("heading", { name: "Edit Coupon" });
}

function clickSave() {
  fireEvent.click(screen.getByRole("button", { name: /Save Changes/ }));
}

function getStatusCells(): HTMLElement[] {
  return screen.getAllByRole("button", { name: /change status/i });
}

beforeEach(() => {
  jest.clearAllMocks();
  window.scrollTo = jest.fn();
  mock_list_tiers.mockResolvedValue([makeTier(), makeTier({ id: "dr60", label: "DR 60+" })]);
  mock_update.mockImplementation(async (_id, payload) => makeCoupon(payload as Partial<Coupon>));
});

// ── Saving with each discount scope ─────────────────────────────────────────

describe("saving a coupon in edit mode", () => {
  it("saves a Minimum Purchase coupon without asking for DR tiers", async () => {
    await renderEditPage();

    clickSave();

    await waitFor(() => expect(mock_update).toHaveBeenCalledTimes(1));
    expect(mock_update).toHaveBeenCalledWith(
      "coupon-1",
      expect.objectContaining({
        code: "TESTLAUNCH100",
        applies_to: "minimum_purchase",
        minimum_purchase_amount: 800,
        dr_tier_ids: [],
        is_active: true,
      })
    );
    expect(screen.queryByText(/DR tier/i, { selector: "p.text-red-500" })).not.toBeInTheDocument();
    await waitFor(() => expect(mock_push).toHaveBeenCalledWith("/admin/coupons"));
  });

  it("clears the DR tiers and minimum amount when switching to All Products", async () => {
    await renderEditPage(makeCoupon({ applies_to: "specific_product", dr_tier_ids: ["dr50"], minimum_purchase_amount: null }));

    fireEvent.click(screen.getByRole("button", { name: /^All Products/ }));
    clickSave();

    await waitFor(() => expect(mock_update).toHaveBeenCalled());
    expect(mock_update.mock.calls[0][1]).toEqual(
      expect.objectContaining({ applies_to: "all", dr_tier_ids: [], minimum_purchase_amount: null })
    );
  });

  it("sends the selected tiers for a DR Tiers coupon", async () => {
    await renderEditPage(makeCoupon({ applies_to: "specific_product", dr_tier_ids: ["dr50"], minimum_purchase_amount: null }));

    clickSave();

    await waitFor(() => expect(mock_update).toHaveBeenCalled());
    expect(mock_update.mock.calls[0][1]).toEqual(
      expect.objectContaining({ applies_to: "specific_product", dr_tier_ids: ["dr50"], minimum_purchase_amount: null })
    );
  });

  it("asks for a DR tier only when the scope is DR Tiers", async () => {
    await renderEditPage(makeCoupon({ applies_to: "all", minimum_purchase_amount: null }));

    fireEvent.click(screen.getByRole("button", { name: /^DR Tiers/ }));
    clickSave();

    expect(await screen.findByText("Select at least one DR tier.")).toBeInTheDocument();
    expect(mock_update).not.toHaveBeenCalled();
  });

  it("asks for a minimum amount when the scope is Minimum Purchase", async () => {
    await renderEditPage(makeCoupon({ applies_to: "all", minimum_purchase_amount: null }));

    fireEvent.click(screen.getByRole("button", { name: /^Min\. Purchase/ }));
    clickSave();

    expect(await screen.findByText("Enter a valid minimum amount.")).toBeInTheDocument();
    expect(mock_update).not.toHaveBeenCalled();
  });

  it("shows the server message when saving fails", async () => {
    mock_update.mockRejectedValueOnce({ message: "The code has already been taken." });
    await renderEditPage();

    clickSave();

    expect(await screen.findByText("The code has already been taken.")).toBeInTheDocument();
    expect(mock_push).not.toHaveBeenCalled();
  });
});

// ── Instant status control ──────────────────────────────────────────────────

describe("status control in edit mode", () => {
  it("is available in the header and in the Status section", async () => {
    await renderEditPage();

    const cells = getStatusCells();
    expect(cells).toHaveLength(2);
    cells.forEach((cell) => expect(cell).toHaveTextContent("Active"));
    expect(screen.getByText(/Status changes are saved instantly/)).toBeInTheDocument();
  });

  it("disables the coupon without submitting the form", async () => {
    mock_toggle.mockResolvedValueOnce(makeCoupon({ is_active: false }));
    await renderEditPage();

    fireEvent.click(getStatusCells()[0]);
    fireEvent.click(within(screen.getByRole("menu")).getByRole("menuitemradio", { name: "Disabled" }));

    await waitFor(() => getStatusCells().forEach((cell) => expect(cell).toHaveTextContent("Disabled")));
    expect(mock_toggle).toHaveBeenCalledWith("coupon-1", false);
    expect(mock_update).not.toHaveBeenCalled();
    // The live preview follows the saved status.
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });

  it("still disables the coupon when the form has validation errors", async () => {
    mock_toggle.mockResolvedValueOnce(makeCoupon({ is_active: false }));
    await renderEditPage();

    fireEvent.change(screen.getByPlaceholderText("e.g. Summer Sale 20% Off"), { target: { value: "" } });
    clickSave();
    expect(await screen.findByText("Name is required.")).toBeInTheDocument();

    fireEvent.click(getStatusCells()[1]);
    fireEvent.click(within(screen.getByRole("menu")).getByRole("menuitemradio", { name: "Disabled" }));

    await waitFor(() => expect(mock_toggle).toHaveBeenCalledWith("coupon-1", false));
    expect(mock_update).not.toHaveBeenCalled();
  });

  it("keeps the saved status when Save Changes is clicked afterwards", async () => {
    mock_toggle.mockResolvedValueOnce(makeCoupon({ is_active: false }));
    await renderEditPage();

    fireEvent.click(getStatusCells()[0]);
    fireEvent.click(within(screen.getByRole("menu")).getByRole("menuitemradio", { name: "Disabled" }));
    await waitFor(() => expect(getStatusCells()[0]).toHaveTextContent("Disabled"));

    clickSave();

    await waitFor(() => expect(mock_update).toHaveBeenCalled());
    expect(mock_update.mock.calls[0][1]).toEqual(expect.objectContaining({ is_active: false }));
  });
});

// ── Create mode and loading ─────────────────────────────────────────────────

describe("create mode", () => {
  it("uses the local toggle instead of the instant status control", async () => {
    render(<CouponFormPage mode="create" />);
    await screen.findByRole("heading", { name: "Create New Coupon" });

    expect(screen.queryByRole("button", { name: /change status/i })).not.toBeInTheDocument();
    expect(screen.getByText("Coupon is active")).toBeInTheDocument();
    expect(mock_get).not.toHaveBeenCalled();
  });

  it("creates an All Products coupon with an empty DR tier list", async () => {
    mock_create.mockResolvedValueOnce(makeCoupon());
    render(<CouponFormPage mode="create" />);
    await screen.findByRole("heading", { name: "Create New Coupon" });

    fireEvent.change(screen.getByPlaceholderText("e.g. SAVE20"), { target: { value: "spring10" } });
    fireEvent.change(screen.getByPlaceholderText("e.g. Summer Sale 20% Off"), { target: { value: "Spring 10" } });
    fireEvent.click(screen.getByRole("button", { name: /Create Coupon/ }));

    await waitFor(() => expect(mock_create).toHaveBeenCalled());
    expect(mock_create.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        code: "SPRING10",
        name: "Spring 10",
        applies_to: "all",
        dr_tier_ids: [],
        minimum_purchase_amount: null,
        is_active: true,
      })
    );
  });
});

describe("loading", () => {
  it("shows an error when the coupon cannot be loaded", async () => {
    mock_get.mockRejectedValueOnce(new Error("Network error"));
    render(<CouponFormPage mode="edit" coupon_id="coupon-1" />);

    expect(await screen.findByText("Failed to load data. Please go back and try again.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Coupons" })).toHaveAttribute("href", "/admin/coupons");
  });
});
