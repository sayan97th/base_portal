/**
 * "Promo Code Stacking" option of the admin discount form
 * (src/components/admin/discounts/DiscountFormPage.tsx).
 *
 * Promotions never stack by default, so the option is off for new discounts
 * and for existing ones saved before the option existed.
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DiscountFormPage from "@/components/admin/discounts/DiscountFormPage";
import type { Discount } from "@/types/admin/discounts";
import { makeBulkDiscount as makeDiscount } from "../../../utils/promo-code-stacking-fixtures";

const mock_push = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mock_push }),
}));

jest.mock("@/services/admin/discounts.service", () => ({
  createAdminDiscount: jest.fn(),
  updateAdminDiscount: jest.fn(),
  getAdminDiscount: jest.fn(),
  fetchDiscountFormDrTiers: jest.fn(),
}));

import {
  createAdminDiscount,
  fetchDiscountFormDrTiers,
  getAdminDiscount,
  updateAdminDiscount,
} from "@/services/admin/discounts.service";

const mock_create = createAdminDiscount as jest.MockedFunction<typeof createAdminDiscount>;
const mock_update = updateAdminDiscount as jest.MockedFunction<typeof updateAdminDiscount>;
const mock_get = getAdminDiscount as jest.MockedFunction<typeof getAdminDiscount>;
const mock_fetch_tiers = fetchDiscountFormDrTiers as jest.MockedFunction<typeof fetchDiscountFormDrTiers>;

function stackingSwitch(): HTMLElement {
  return screen.getByRole("switch", { name: "Allow promo code stacking" });
}

describe("DiscountFormPage promo code stacking", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mock_fetch_tiers.mockResolvedValue([]);
  });

  it("is off by default for a new discount", async () => {
    render(<DiscountFormPage mode="create" />);

    expect(await screen.findByText("Promo Code Stacking")).toBeInTheDocument();
    expect(stackingSwitch()).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText("Do not combine with promo codes")).toBeInTheDocument();
    expect(screen.getByText("Replaced by any promo code")).toBeInTheDocument();
  });

  it("sends the option as false when creating a discount without touching it", async () => {
    mock_create.mockResolvedValue(makeDiscount());
    render(<DiscountFormPage mode="create" />);

    await userEvent.type(await screen.findByPlaceholderText(/Bulk Link Building/), "Holiday bulk");
    await userEvent.click(screen.getByRole("button", { name: "Create Discount" }));

    await waitFor(() => expect(mock_create).toHaveBeenCalledTimes(1));
    expect(mock_create.mock.calls[0][0]).toMatchObject({ allow_promo_code_stacking: false });
  });

  it("lets the admin allow stacking with money back promo codes", async () => {
    mock_create.mockResolvedValue(makeDiscount({ allow_promo_code_stacking: true }));
    render(<DiscountFormPage mode="create" />);

    await userEvent.type(await screen.findByPlaceholderText(/Bulk Link Building/), "Holiday bulk");
    await userEvent.click(stackingSwitch());

    expect(stackingSwitch()).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("Combine with money back promo codes")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Create Discount" }));

    await waitFor(() => expect(mock_create).toHaveBeenCalledTimes(1));
    expect(mock_create.mock.calls[0][0]).toMatchObject({ allow_promo_code_stacking: true });
  });

  it("loads and saves the option of an existing discount", async () => {
    mock_get.mockResolvedValue(makeDiscount({ allow_promo_code_stacking: true }));
    mock_update.mockResolvedValue(makeDiscount());
    render(<DiscountFormPage mode="edit" discount_id="discount-1" />);

    await waitFor(() => expect(stackingSwitch()).toHaveAttribute("aria-checked", "true"));

    await userEvent.click(stackingSwitch());
    await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(mock_update).toHaveBeenCalledTimes(1));
    expect(mock_update.mock.calls[0][1]).toMatchObject({ allow_promo_code_stacking: false });
  });

  it("updates the live preview when the option changes", async () => {
    render(<DiscountFormPage mode="create" />);

    expect(await screen.findByText("Replaced by any promo code")).toBeInTheDocument();

    await userEvent.click(stackingSwitch());

    expect(screen.getByText("Stacks with money back promo codes")).toBeInTheDocument();
    expect(screen.queryByText("Replaced by any promo code")).not.toBeInTheDocument();
  });

  it("explains that price discount promo codes still replace a stackable discount", async () => {
    render(<DiscountFormPage mode="create" />);

    await userEvent.click(await screen.findByRole("switch", { name: "Allow promo code stacking" }));

    expect(screen.getByText(/Promo codes that lower the price still replace it\./)).toBeInTheDocument();
  });

  it("keeps the option off when only other fields are edited", async () => {
    mock_get.mockResolvedValue(makeDiscount());
    mock_update.mockResolvedValue(makeDiscount());
    render(<DiscountFormPage mode="edit" discount_id="discount-1" />);

    await waitFor(() => expect(stackingSwitch()).toHaveAttribute("aria-checked", "false"));
    await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(mock_update).toHaveBeenCalledTimes(1));
    expect(mock_update.mock.calls[0][1]).toMatchObject({ allow_promo_code_stacking: false });
  });

  it("treats a discount saved before the option existed as not stackable", async () => {
    const legacy_discount = makeDiscount();
    delete (legacy_discount as Partial<Discount>).allow_promo_code_stacking;
    mock_get.mockResolvedValue(legacy_discount);
    render(<DiscountFormPage mode="edit" discount_id="discount-1" />);

    await waitFor(() => expect(stackingSwitch()).toHaveAttribute("aria-checked", "false"));
  });
});
