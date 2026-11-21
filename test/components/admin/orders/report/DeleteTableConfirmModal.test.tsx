/**
 * Tests for the order report table delete modal
 * (src/components/admin/orders/report/DeleteTableConfirmModal.tsx), a thin
 * wrapper around the shared ConfirmDeleteDialog.
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DeleteTableConfirmModal from "@/components/admin/orders/report/DeleteTableConfirmModal";
import type { ReportTable } from "@/types/admin/order-report";

function makeTable(row_count: number, overrides: Partial<ReportTable> = {}): ReportTable {
  return {
    id: "table-1",
    title: "January placements",
    description: null,
    rows: Array.from({ length: row_count }, (_, index) => ({ id: `row-${index}` })),
    ...overrides,
  } as unknown as ReportTable;
}

function renderModal(table: ReportTable | null, overrides: { is_open?: boolean; is_deleting?: boolean } = {}) {
  const on_confirm = jest.fn();
  const on_close = jest.fn();

  render(
    <DeleteTableConfirmModal
      is_open={overrides.is_open ?? true}
      is_deleting={overrides.is_deleting ?? false}
      table={table}
      onConfirm={on_confirm}
      onClose={on_close}
    />
  );

  return { on_confirm, on_close };
}

describe("DeleteTableConfirmModal", () => {
  it("renders nothing without a table", () => {
    renderModal(null);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("renders nothing when closed", () => {
    renderModal(makeTable(2), { is_open: false });
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("warns about the rows that will be removed", () => {
    renderModal(makeTable(3));

    const dialog = screen.getByRole("alertdialog", { name: "Delete table" });
    expect(within(dialog).getByText("January placements")).toBeInTheDocument();
    expect(within(dialog).getByText("3 rows")).toBeInTheDocument();
    expect(
      within(dialog).getByText("All 3 rows inside this table will be permanently removed.")
    ).toBeInTheDocument();
  });

  it("uses singular wording for a single row", () => {
    renderModal(makeTable(1));

    expect(
      screen.getByText("All 1 row inside this table will be permanently removed.")
    ).toBeInTheDocument();
  });

  it("does not warn about rows for an empty table", () => {
    renderModal(makeTable(0));

    expect(screen.queryByText(/inside this table/)).not.toBeInTheDocument();
  });

  it("shows the description instead of the row count when there is one", () => {
    renderModal(makeTable(2, { description: "Live links for January" }));

    expect(screen.getByText("Live links for January")).toBeInTheDocument();
  });

  it("forwards confirm and close actions", async () => {
    const { on_confirm, on_close } = renderModal(makeTable(2));

    await userEvent.click(screen.getByRole("button", { name: "Delete table" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(on_confirm).toHaveBeenCalledTimes(1);
    expect(on_close).toHaveBeenCalledTimes(1);
  });

  it("disables both actions while deleting", () => {
    renderModal(makeTable(2), { is_deleting: true });

    expect(screen.getByRole("button", { name: /Deleting/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });
});
