/**
 * Content Refresh tier delete flow of the admin link building page
 * (src/components/admin/link-building/AdminLinkBuildingContent.tsx).
 *
 * This page used the native window.confirm() before, now it renders the
 * shared ConfirmDeleteDialog.
 */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminLinkBuildingContent from "@/components/admin/link-building/AdminLinkBuildingContent";
import type { AdminContentRefreshTier } from "@/types/admin/content-refresh";

jest.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ isAdmin: true }),
}));

jest.mock("@/services/admin/link-building.service");

import {
  deleteAdminContentRefreshTier,
  listAdminContentRefreshTiers,
  listAdminDrTiers,
} from "@/services/admin/link-building.service";

const mock_list_dr = listAdminDrTiers as jest.MockedFunction<typeof listAdminDrTiers>;
const mock_list_cr = listAdminContentRefreshTiers as jest.MockedFunction<typeof listAdminContentRefreshTiers>;
const mock_delete_cr = deleteAdminContentRefreshTier as jest.MockedFunction<
  typeof deleteAdminContentRefreshTier
>;

function makeCrTier(overrides: Partial<AdminContentRefreshTier> = {}): AdminContentRefreshTier {
  return {
    id: "refresh-1500",
    label: "Refresh up to 1,500 words",
    word_count_range: "1000-1500",
    turnaround_days: 4,
    price: 180,
    is_active: true,
    is_most_popular: false,
    max_quantity: null,
    is_hidden: false,
    sort_order: 1,
    ...overrides,
  };
}

async function openContentRefreshDeleteDialog() {
  render(<AdminLinkBuildingContent />);
  await userEvent.click(await screen.findByRole("button", { name: /Content Refresh/ }));
  await userEvent.click(await screen.findByRole("button", { name: "Delete tier" }));
  return screen.getByRole("alertdialog", { name: "Delete content refresh tier" });
}

describe("AdminLinkBuildingContent content refresh delete flow", () => {
  let confirm_spy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mock_list_dr.mockResolvedValue([]);
    mock_list_cr.mockResolvedValue([makeCrTier()]);
    confirm_spy = jest.spyOn(window, "confirm");
  });

  afterEach(() => {
    confirm_spy.mockRestore();
  });

  it("uses the custom dialog instead of the native confirm", async () => {
    const dialog = await openContentRefreshDeleteDialog();

    expect(confirm_spy).not.toHaveBeenCalled();
    expect(within(dialog).getByText("Refresh up to 1,500 words")).toBeInTheDocument();
    expect(within(dialog).getByText("1000-1500 words · $180.00")).toBeInTheDocument();
    expect(
      within(dialog).getByText("This tier is currently active and visible to clients.")
    ).toBeInTheDocument();
  });

  it("deletes the tier and reloads the list", async () => {
    mock_delete_cr.mockResolvedValue(undefined);
    const dialog = await openContentRefreshDeleteDialog();
    const list_calls_before = mock_list_cr.mock.calls.length;

    await userEvent.click(within(dialog).getByRole("button", { name: "Delete tier" }));

    expect(mock_delete_cr).toHaveBeenCalledWith("refresh-1500");
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(mock_list_cr.mock.calls.length).toBeGreaterThan(list_calls_before);
  });

  it("shows an error and closes the dialog when the API fails", async () => {
    mock_delete_cr.mockRejectedValue(new Error("Server error"));
    const dialog = await openContentRefreshDeleteDialog();

    await userEvent.click(within(dialog).getByRole("button", { name: "Delete tier" }));

    expect(await screen.findByText("Failed to delete tier. Please try again.")).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("cancel keeps the tier", async () => {
    const dialog = await openContentRefreshDeleteDialog();

    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(mock_delete_cr).not.toHaveBeenCalled();
    expect(screen.getByText("Refresh up to 1,500 words")).toBeInTheDocument();
  });
});
