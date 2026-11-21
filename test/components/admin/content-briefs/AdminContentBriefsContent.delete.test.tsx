/**
 * Delete flow of the admin content brief tiers page
 * (src/components/admin/content-briefs/AdminContentBriefsContent.tsx).
 *
 * The API refuses with a 409 when a tier is used by existing orders, so the
 * page must keep the tier and tell the admin the deletion failed.
 */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminContentBriefsContent from "@/components/admin/content-briefs/AdminContentBriefsContent";
import type { AdminContentBriefTier } from "@/types/admin/content-briefs";

jest.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ isAdmin: true }),
}));

jest.mock("@/services/admin/content-briefs.service", () => ({
  listAdminContentBriefTiers: jest.fn(),
  createAdminContentBriefTier: jest.fn(),
  updateAdminContentBriefTier: jest.fn(),
  toggleAdminContentBriefTierStatus: jest.fn(),
  deleteAdminContentBriefTier: jest.fn(),
}));

import {
  deleteAdminContentBriefTier,
  listAdminContentBriefTiers,
} from "@/services/admin/content-briefs.service";

const mock_list = listAdminContentBriefTiers as jest.MockedFunction<typeof listAdminContentBriefTiers>;
const mock_delete = deleteAdminContentBriefTier as jest.MockedFunction<typeof deleteAdminContentBriefTier>;

function makeTier(overrides: Partial<AdminContentBriefTier> = {}): AdminContentBriefTier {
  return {
    id: "brief-standard",
    label: "Standard Brief",
    turnaround_days: 3,
    price: 150,
    is_active: true,
    is_most_popular: false,
    max_quantity: null,
    is_hidden: false,
    sort_order: 1,
    ...overrides,
  };
}

async function openDeleteDialog() {
  const delete_buttons = await screen.findAllByRole("button", { name: "Delete" });
  await userEvent.click(delete_buttons[0]);
  return screen.getByRole("alertdialog", { name: "Delete content brief tier" });
}

describe("AdminContentBriefsContent delete flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mock_list.mockResolvedValue([makeTier()]);
  });

  it("shows the tier label, price and active warning", async () => {
    render(<AdminContentBriefsContent />);

    const dialog = await openDeleteDialog();

    expect(within(dialog).getByText("Standard Brief")).toBeInTheDocument();
    expect(within(dialog).getByText("$150.00")).toBeInTheDocument();
    expect(
      within(dialog).getByText("This tier is currently active and visible to clients.")
    ).toBeInTheDocument();
  });

  it("deletes the tier and reloads the list", async () => {
    mock_delete.mockResolvedValue(undefined);
    render(<AdminContentBriefsContent />);

    const dialog = await openDeleteDialog();
    mock_list.mockResolvedValue([]);
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete tier" }));

    expect(mock_delete).toHaveBeenCalledWith("brief-standard");
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(mock_list).toHaveBeenCalledTimes(2);
  });

  it("keeps the tier when the API refuses the deletion", async () => {
    mock_delete.mockRejectedValue(
      Object.assign(new Error("This tier cannot be deleted because it is referenced by existing orders."), {
        status: 409,
      })
    );
    render(<AdminContentBriefsContent />);

    const dialog = await openDeleteDialog();
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete tier" }));

    expect(await screen.findByText("Failed to delete tier. Please try again.")).toBeInTheDocument();
    expect(mock_list).toHaveBeenCalledTimes(1);
    expect(within(dialog).getByRole("button", { name: "Delete tier" })).toBeEnabled();
  });

  it("cancel closes the dialog without calling the API", async () => {
    render(<AdminContentBriefsContent />);

    const dialog = await openDeleteDialog();
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(mock_delete).not.toHaveBeenCalled();
  });
});
