/**
 * Tests for the "Saved Filters" menu of the admin Link Building Orders table:
 * listing own and shared filters, applying, saving, overwriting, sharing,
 * renaming and deleting.
 */

import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import SavedFiltersMenu from "@/components/admin/dashboard/SavedFiltersMenu";
import {
  listSavedFilters,
  createSavedFilter,
  updateSavedFilter,
  deleteSavedFilter,
} from "@/services/admin/link-building-saved-filters.service";
import { EMPTY_FILTER_STATE } from "@/lib/link-building-saved-filters";
import type {
  LinkBuildingOrderFilterState,
  LinkBuildingOrderSavedFilter,
} from "@/types/admin/link-building-order";

jest.mock("@/services/admin/link-building-saved-filters.service", () => ({
  listSavedFilters:  jest.fn(),
  createSavedFilter: jest.fn(),
  updateSavedFilter: jest.fn(),
  deleteSavedFilter: jest.fn(),
}));

const mockListSavedFilters = listSavedFilters as jest.MockedFunction<typeof listSavedFilters>;
const mockCreateSavedFilter = createSavedFilter as jest.MockedFunction<typeof createSavedFilter>;
const mockUpdateSavedFilter = updateSavedFilter as jest.MockedFunction<typeof updateSavedFilter>;
const mockDeleteSavedFilter = deleteSavedFilter as jest.MockedFunction<typeof deleteSavedFilter>;

const LIVE_STATE: LinkBuildingOrderFilterState = { ...EMPTY_FILTER_STATE, status: "Live" };
const PENDING_STATE: LinkBuildingOrderFilterState = { ...EMPTY_FILTER_STATE, status: "Pending" };

function makeSavedFilter(overrides: Partial<LinkBuildingOrderSavedFilter> = {}): LinkBuildingOrderSavedFilter {
  return {
    id:         "saved-1",
    name:       "Live links",
    filters:    LIVE_STATE,
    is_shared:  false,
    is_owner:   true,
    can_delete: true,
    owner_name: "Ana Admin",
    created_at: null,
    updated_at: null,
    ...overrides,
  };
}

type MenuProps = React.ComponentProps<typeof SavedFiltersMenu>;

/** The table owns the applied filter id, this wrapper plays that role in the tests. */
function ControlledMenu(props: Omit<MenuProps, "applied_filter_id" | "onAppliedFilterChange"> & Partial<MenuProps>) {
  const [applied_filter_id, setAppliedFilterId] = React.useState<string | null>(props.applied_filter_id ?? null);
  return (
    <SavedFiltersMenu
      {...props}
      applied_filter_id={applied_filter_id}
      onAppliedFilterChange={(id) => {
        setAppliedFilterId(id);
        props.onAppliedFilterChange?.(id);
      }}
    />
  );
}

function renderMenu(props: Partial<MenuProps> = {}) {
  const onApply = jest.fn();
  const onNotify = jest.fn();
  const utils = render(
    <ControlledMenu
      current_state={LIVE_STATE}
      has_active_filters
      onApply={onApply}
      onNotify={onNotify}
      {...props}
    />
  );
  return { ...utils, onApply, onNotify };
}

async function openMenu() {
  fireEvent.click(screen.getByRole("button", { name: /Saved Filters/ }));
  await waitFor(() => expect(mockListSavedFilters).toHaveBeenCalled());
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("SavedFiltersMenu", () => {
  it("does not load anything until the menu is opened", () => {
    mockListSavedFilters.mockResolvedValue([]);
    renderMenu();
    expect(mockListSavedFilters).not.toHaveBeenCalled();
  });

  it("groups the user's own filters and the ones shared by the team", async () => {
    mockListSavedFilters.mockResolvedValue([
      makeSavedFilter(),
      makeSavedFilter({ id: "saved-2", name: "Team review", is_owner: false, is_shared: true, can_delete: false, owner_name: "Omar Other" }),
    ]);
    renderMenu();
    await openMenu();

    expect(await screen.findByText("My filters")).toBeInTheDocument();
    expect(screen.getByText("Shared by the team")).toBeInTheDocument();
    expect(screen.getByText(/by Omar Other/)).toBeInTheDocument();
    // Only the owner can manage a filter.
    expect(screen.getAllByRole("button", { name: "Rename" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Delete" })).toHaveLength(1);
  });

  it("applies a saved filter, closes, and shows its name on the toolbar button", async () => {
    mockListSavedFilters.mockResolvedValue([makeSavedFilter()]);
    const { onApply, onNotify } = renderMenu();
    await openMenu();

    fireEvent.click(await screen.findByRole("button", { name: /Live links/ }));

    expect(onApply).toHaveBeenCalledWith(LIVE_STATE);
    expect(onNotify).toHaveBeenCalledWith('Applied the "Live links" saved filter.');
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Live links/ })).toBeInTheDocument();
  });

  it("disables saving when there are no active filters", async () => {
    mockListSavedFilters.mockResolvedValue([]);
    renderMenu({ current_state: EMPTY_FILTER_STATE, has_active_filters: false });
    await openMenu();

    expect(screen.getByRole("textbox", { name: "New saved filter name" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("saves the current state with the chosen name and sharing option", async () => {
    mockListSavedFilters.mockResolvedValue([]);
    mockCreateSavedFilter.mockResolvedValue(makeSavedFilter({ id: "saved-9", name: "Weekly check", is_shared: true }));
    renderMenu();
    await openMenu();

    fireEvent.change(screen.getByRole("textbox", { name: "New saved filter name" }), {
      target: { value: "  Weekly check " },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "Share with the team" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(mockCreateSavedFilter).toHaveBeenCalledWith({
        name: "Weekly check",
        filters: LIVE_STATE,
        is_shared: true,
      })
    );
    // Listed in the menu and shown on the toolbar button, since it is now the applied filter.
    expect(await screen.findAllByText("Weekly check")).toHaveLength(2);
  });

  it("shows the API error when saving fails", async () => {
    mockListSavedFilters.mockResolvedValue([]);
    mockCreateSavedFilter.mockRejectedValue({
      message: "The given data was invalid.",
      errors: { name: ["You already have a saved filter with this name."] },
    });
    renderMenu();
    await openMenu();

    fireEvent.change(screen.getByRole("textbox", { name: "New saved filter name" }), {
      target: { value: "Live links" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText(/You already have a saved filter with this name/)).toBeInTheDocument();
  });

  it("flags the applied filter as modified and lets the owner update it", async () => {
    mockListSavedFilters.mockResolvedValue([makeSavedFilter()]);
    mockUpdateSavedFilter.mockResolvedValue(makeSavedFilter({ filters: PENDING_STATE }));
    const { rerender, onApply, onNotify } = renderMenu();
    await openMenu();
    fireEvent.click(await screen.findByRole("button", { name: /Live links/ }));

    // The table state drifts away from what was saved.
    rerender(
      <ControlledMenu current_state={PENDING_STATE} has_active_filters onApply={onApply} onNotify={onNotify} />
    );
    expect(screen.getByLabelText("Modified")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Live links/ }));
    expect(screen.getByText(/has unsaved changes/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() =>
      expect(mockUpdateSavedFilter).toHaveBeenCalledWith("saved-1", { filters: PENDING_STATE })
    );
    await waitFor(() => expect(screen.queryByLabelText("Modified")).not.toBeInTheDocument());
  });

  it("toggles sharing for an owned filter", async () => {
    mockListSavedFilters.mockResolvedValue([makeSavedFilter()]);
    mockUpdateSavedFilter.mockResolvedValue(makeSavedFilter({ is_shared: true }));
    renderMenu();
    await openMenu();

    fireEvent.click(await screen.findByRole("button", { name: "Share with the team" }));

    await waitFor(() => expect(mockUpdateSavedFilter).toHaveBeenCalledWith("saved-1", { is_shared: true }));
    expect(await screen.findByText("Shared")).toBeInTheDocument();
  });

  it("renames a filter inline", async () => {
    mockListSavedFilters.mockResolvedValue([makeSavedFilter()]);
    mockUpdateSavedFilter.mockResolvedValue(makeSavedFilter({ name: "Live placements" }));
    renderMenu();
    await openMenu();

    fireEvent.click(await screen.findByRole("button", { name: "Rename" }));
    const input = screen.getByRole("textbox", { name: "Saved filter name" });
    fireEvent.change(input, { target: { value: "Live placements" } });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() => expect(mockUpdateSavedFilter).toHaveBeenCalledWith("saved-1", { name: "Live placements" }));
    expect(await screen.findByText("Live placements")).toBeInTheDocument();
  });

  it("asks for confirmation before deleting", async () => {
    mockListSavedFilters.mockResolvedValue([makeSavedFilter()]);
    mockDeleteSavedFilter.mockResolvedValue();
    renderMenu();
    await openMenu();

    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
    expect(mockDeleteSavedFilter).not.toHaveBeenCalled();
    expect(screen.getByText(/Delete .Live links.\?/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(mockDeleteSavedFilter).toHaveBeenCalledWith("saved-1"));
    expect(await screen.findByText(/No saved filters yet/)).toBeInTheDocument();
  });

  it("loads the list right away to show a saved filter restored with the view", async () => {
    mockListSavedFilters.mockResolvedValue([makeSavedFilter()]);
    renderMenu({ applied_filter_id: "saved-1" });

    expect(await screen.findByRole("button", { name: /Live links/ })).toBeInTheDocument();
  });

  it("forgets a restored saved filter that no longer exists", async () => {
    mockListSavedFilters.mockResolvedValue([]);
    const onAppliedFilterChange = jest.fn();
    renderMenu({ applied_filter_id: "deleted-filter", onAppliedFilterChange });

    await waitFor(() => expect(onAppliedFilterChange).toHaveBeenCalledWith(null));
    expect(screen.getByRole("button", { name: /Saved Filters/ })).toBeInTheDocument();
  });
});
