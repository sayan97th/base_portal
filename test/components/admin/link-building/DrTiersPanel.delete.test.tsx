/**
 * Remove flow of the DR tiers panel (src/components/admin/link-building/DrTiersPanel.tsx).
 * Removing a DR tier soft deletes it in the API, so the dialog uses the
 * "remove" variant instead of the permanent delete wording.
 */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DrTiersPanel from "@/components/admin/link-building/DrTiersPanel";
import type { AdminDrTier } from "@/types/admin/link-building";

jest.mock("@/services/admin/link-building.service");

import { deleteAdminDrTier } from "@/services/admin/link-building.service";

const mock_delete = deleteAdminDrTier as jest.MockedFunction<typeof deleteAdminDrTier>;

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
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function renderPanel(on_refresh = jest.fn()) {
  render(<DrTiersPanel tiers={[makeTier()]} service_name="Link Building" onRefresh={on_refresh} />);
  return on_refresh;
}

async function openRemoveDialog() {
  await userEvent.click(screen.getByRole("button", { name: "Remove" }));
  return screen.getByRole("alertdialog", { name: "Remove DR tier" });
}

describe("DrTiersPanel remove flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("uses the remove variant with the tier price", async () => {
    renderPanel();

    const dialog = await openRemoveDialog();

    expect(within(dialog).getByText("DR 50+")).toBeInTheDocument();
    expect(within(dialog).getByText("$400.00 per link")).toBeInTheDocument();
    expect(within(dialog).getByText("Link Building")).toBeInTheDocument();
    expect(within(dialog).queryByText(/cannot be undone/i)).not.toBeInTheDocument();
  });

  it("removes the tier and asks the parent to refresh", async () => {
    mock_delete.mockResolvedValue(undefined);
    const on_refresh = renderPanel();

    const dialog = await openRemoveDialog();
    await userEvent.click(within(dialog).getByRole("button", { name: "Remove tier" }));

    expect(mock_delete).toHaveBeenCalledWith("dr50");
    await waitFor(() => expect(on_refresh).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("keeps the dialog usable and shows an error when the API fails", async () => {
    mock_delete.mockRejectedValue(new Error("Server error"));
    const on_refresh = renderPanel();

    const dialog = await openRemoveDialog();
    await userEvent.click(within(dialog).getByRole("button", { name: "Remove tier" }));

    expect(await screen.findByText("Failed to remove tier.")).toBeInTheDocument();
    expect(on_refresh).not.toHaveBeenCalled();
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeEnabled();
  });

  it("cancel does not call the API", async () => {
    renderPanel();

    const dialog = await openRemoveDialog();
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(mock_delete).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});
