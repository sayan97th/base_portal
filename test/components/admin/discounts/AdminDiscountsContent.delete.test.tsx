/**
 * Delete flow of the admin discounts page (src/components/admin/discounts/AdminDiscountsContent.tsx).
 * The page uses the shared ConfirmDeleteDialog.
 */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminDiscountsContent from "@/components/admin/discounts/AdminDiscountsContent";
import type { Discount } from "@/types/admin/discounts";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/services/admin/discounts.service", () => ({
  listAdminDiscounts: jest.fn(),
  toggleAdminDiscountStatus: jest.fn(),
  deleteAdminDiscount: jest.fn(),
}));

import { deleteAdminDiscount, listAdminDiscounts } from "@/services/admin/discounts.service";

const mock_list = listAdminDiscounts as jest.MockedFunction<typeof listAdminDiscounts>;
const mock_delete = deleteAdminDiscount as jest.MockedFunction<typeof deleteAdminDiscount>;

function makeDiscount(overrides: Partial<Discount> = {}): Discount {
  return {
    id: "discount-1",
    name: "Bulk 12+ links",
    description: "10% off when ordering 12 links or more.",
    discount_type: "bulk",
    discount_rate: 10,
    min_quantity: 12,
    applies_to: "link_building",
    is_active: true,
    dr_tier_ids: [],
    dr_tiers: [],
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  } as Discount;
}

async function openDeleteDialogFor(discount_name: string) {
  const row = (await screen.findByText(discount_name)).closest("tr") as HTMLElement;
  await userEvent.click(within(row).getByTitle("Delete"));
  return screen.getByRole("alertdialog", { name: "Delete discount" });
}

describe("AdminDiscountsContent delete flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mock_list.mockResolvedValue([
      makeDiscount(),
      makeDiscount({ id: "discount-2", name: "Spring promo", is_active: false, description: null }),
    ]);
  });

  it("opens the dialog with a preview of the selected discount", async () => {
    render(<AdminDiscountsContent />);

    const dialog = await openDeleteDialogFor("Bulk 12+ links");

    expect(within(dialog).getByText("Discount")).toBeInTheDocument();
    expect(within(dialog).getByText("Bulk 12+ links")).toBeInTheDocument();
    expect(
      within(dialog).getByText("This discount is currently active and will stop applying immediately.")
    ).toBeInTheDocument();
  });

  it("does not warn about active status for inactive discounts", async () => {
    render(<AdminDiscountsContent />);

    const dialog = await openDeleteDialogFor("Spring promo");

    expect(within(dialog).queryByText(/currently active/)).not.toBeInTheDocument();
  });

  it("deletes the discount and removes it from the table", async () => {
    mock_delete.mockResolvedValue(undefined);
    render(<AdminDiscountsContent />);

    const dialog = await openDeleteDialogFor("Bulk 12+ links");
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete discount" }));

    expect(mock_delete).toHaveBeenCalledWith("discount-1");
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(screen.queryByText("Bulk 12+ links")).not.toBeInTheDocument();
    expect(screen.getByText("Spring promo")).toBeInTheDocument();
  });

  it("cancelling keeps the discount and never calls the API", async () => {
    render(<AdminDiscountsContent />);

    const dialog = await openDeleteDialogFor("Bulk 12+ links");
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(mock_delete).not.toHaveBeenCalled();
    expect(screen.getByText("Bulk 12+ links")).toBeInTheDocument();
  });

  it("locks the dialog while the request is in flight", async () => {
    let resolveDelete: () => void = () => {};
    mock_delete.mockReturnValue(new Promise<void>((resolve) => (resolveDelete = resolve)));
    render(<AdminDiscountsContent />);

    const dialog = await openDeleteDialogFor("Bulk 12+ links");
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete discount" }));

    expect(within(dialog).getByRole("button", { name: /Deleting/ })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeDisabled();

    await userEvent.keyboard("{Escape}");
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    resolveDelete();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("keeps the discount when the API fails", async () => {
    mock_delete.mockRejectedValue(new Error("Server error"));
    render(<AdminDiscountsContent />);

    const dialog = await openDeleteDialogFor("Bulk 12+ links");
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete discount" }));

    expect(await screen.findByText("Failed to delete discount.")).toBeInTheDocument();
    expect(screen.getAllByText("Bulk 12+ links").length).toBeGreaterThan(0);
  });
});
