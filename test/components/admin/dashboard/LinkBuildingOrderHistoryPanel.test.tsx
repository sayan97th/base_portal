/**
 * Tests for the version history panel of the Link Building Orders table: it lists
 * one summary per action, loads the cell changes of an action only when it is
 * opened, and restores one after confirmation, asking what to do with cells that
 * were edited again since.
 */

import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import LinkBuildingOrderHistoryPanel from "@/components/admin/dashboard/LinkBuildingOrderHistoryPanel";
import type { LinkBuildingRestoreResult } from "@/services/admin/link-building-order-history.service";
import type { LinkBuildingHistoryBatch, LinkBuildingOrderRevision } from "@/types/admin/link-building-order-history";

jest.mock("@/services/admin/link-building-order-history.service", () => ({
  listLinkBuildingOrderHistory: jest.fn(),
  getLinkBuildingOrderHistoryBatch: jest.fn(),
  getLinkBuildingOrderRowHistory: jest.fn(),
  restoreLinkBuildingOrderHistory: jest.fn(),
}));

import {
  getLinkBuildingOrderHistoryBatch,
  getLinkBuildingOrderRowHistory,
  listLinkBuildingOrderHistory,
  restoreLinkBuildingOrderHistory,
} from "@/services/admin/link-building-order-history.service";

const mockList = listLinkBuildingOrderHistory as jest.MockedFunction<typeof listLinkBuildingOrderHistory>;
const mockBatch = getLinkBuildingOrderHistoryBatch as jest.MockedFunction<typeof getLinkBuildingOrderHistoryBatch>;
const mockRowHistory = getLinkBuildingOrderRowHistory as jest.MockedFunction<typeof getLinkBuildingOrderRowHistory>;
const mockRestore = restoreLinkBuildingOrderHistory as jest.MockedFunction<typeof restoreLinkBuildingOrderHistory>;

const COLUMN_LABELS = { client: "Company", keyword: "Keyword" };

const paste_revision: LinkBuildingOrderRevision = {
  id: 11,
  batch_id: "batch-paste",
  placement_id: "p1",
  order_id: "BL-25730",
  event: "updated",
  source: "paste",
  changes: [
    { field: "client", old: "Weave", new: "Mather" },
    { field: "keyword", old: "other fatigue icd 10", new: "senior living" },
  ],
  snapshot: null,
  user: { id: 7, name: "Krista B" },
  created_at: new Date().toISOString(),
};

const paste_batch: LinkBuildingHistoryBatch = {
  id: 5,
  batch_id: "batch-paste",
  source: "paste",
  user: { id: 7, name: "Krista B" },
  started_at: new Date().toISOString(),
  revisions_count: 1,
  rows_count: 1,
  cells_count: 2,
  created_count: 0,
  updated_count: 1,
  deleted_count: 0,
  order_ids_preview: ["BL-25730"],
  restored_batch_id: null,
  restored: null,
};

const list_meta = { per_page: 20, has_more: false, next_before_id: null };

const restored_result: LinkBuildingRestoreResult = {
  message: "Restored 2 cell(s).",
  applied: true,
  restored_cells: 2,
  recreated_rows: 0,
  conflicts: [],
  conflicts_count: 0,
  skipped: [],
  skipped_count: 0,
  reload_required: false,
  data: [{ id: "p1" } as never],
  recreated_ids: [],
};

function renderPanel(props: Partial<React.ComponentProps<typeof LinkBuildingOrderHistoryPanel>> = {}) {
  const handlers = { onClose: jest.fn(), onShowAllChanges: jest.fn(), onRestored: jest.fn() };
  render(
    <LinkBuildingOrderHistoryPanel is_open row_id={null} column_labels={COLUMN_LABELS} {...handlers} {...props} />
  );
  return handlers;
}

function confirmRestore(question: RegExp) {
  const prompt = screen.getByText(question).parentElement as HTMLElement;
  fireEvent.click(within(prompt).getByRole("button", { name: "Restore" }));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockList.mockResolvedValue({ data: [paste_batch], meta: list_meta });
  mockBatch.mockResolvedValue({ data: [paste_revision], meta: { per_page: 100, has_more: false, next_after_id: null } });
});

it("lists each action as a summary, and loads its cell changes only when it is opened", async () => {
  renderPanel();

  expect(await screen.findByText("2 cells")).toBeInTheDocument();
  expect(screen.getByText("BL-25730")).toBeInTheDocument();
  expect(screen.getByText(/Krista B/)).toBeInTheDocument();
  expect(mockBatch).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: "Details" }));

  await waitFor(() => expect(mockBatch).toHaveBeenCalledWith("batch-paste", null));
  expect(await screen.findByText("Company")).toBeInTheDocument();
  expect(screen.getByText("Weave")).toBeInTheDocument();
  expect(screen.getByText("Mather")).toBeInTheDocument();
});

it("loads the changes of a large action a page at a time", async () => {
  mockList.mockResolvedValue({
    data: [{ ...paste_batch, revisions_count: 30000, rows_count: 30000, cells_count: 30000, order_ids_preview: ["BL-1", "BL-2"] }],
    meta: list_meta,
  });
  mockBatch
    .mockResolvedValueOnce({ data: [paste_revision], meta: { per_page: 100, has_more: true, next_after_id: 11 } })
    .mockResolvedValueOnce({ data: [{ ...paste_revision, id: 12, order_id: "BL-2" }], meta: { per_page: 100, has_more: true, next_after_id: 12 } });
  renderPanel();

  expect(await screen.findByText("30,000 cells in 30,000 rows")).toBeInTheDocument();
  expect(screen.getByText("BL-1, BL-2 and 29,998 more rows")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Details" }));
  fireEvent.click(await screen.findByRole("button", { name: /Show more \(1 of 30,000 row changes shown\)/ }));

  await waitFor(() => expect(mockBatch).toHaveBeenLastCalledWith("batch-paste", 11));
  expect(await screen.findByText("BL-2")).toBeInTheDocument();
});

it("loads older actions with the cursor of the last one shown", async () => {
  mockList
    .mockResolvedValueOnce({ data: [paste_batch], meta: { per_page: 20, has_more: true, next_before_id: 5 } })
    .mockResolvedValueOnce({ data: [{ ...paste_batch, id: 4, batch_id: "batch-older", cells_count: 1 }], meta: list_meta });
  renderPanel();
  await screen.findByText("2 cells");

  fireEvent.click(screen.getByRole("button", { name: "Load older changes" }));

  await waitFor(() => expect(mockList).toHaveBeenLastCalledWith(expect.objectContaining({ before_id: 5 })));
  expect(await screen.findByText("1 cell")).toBeInTheDocument();
  expect(screen.getByText("2 cells")).toBeInTheDocument();
});

it("filters the history by change type", async () => {
  renderPanel();
  await screen.findByText("2 cells");

  fireEvent.change(screen.getByLabelText("Change type"), { target: { value: "import" } });

  await waitFor(() => expect(mockList).toHaveBeenLastCalledWith(expect.objectContaining({ source: "import", before_id: null })));
});

it("restores an action after confirmation and hands the restored rows to the table", async () => {
  mockRestore.mockResolvedValue(restored_result);
  const { onRestored } = renderPanel();
  await screen.findByText("2 cells");

  fireEvent.click(screen.getByRole("button", { name: "Restore" }));
  expect(mockRestore).not.toHaveBeenCalled();
  confirmRestore(/to how they were before this paste/);

  await waitFor(() => expect(mockRestore).toHaveBeenCalledWith({ batch_id: "batch-paste" }, "abort", expect.any(Function)));
  expect(onRestored).toHaveBeenCalledWith(restored_result);
  expect(await screen.findByText("Restored 2 cell(s).")).toBeInTheDocument();
});

it("tells the admin a large restore runs in the background", async () => {
  let finish: (result: LinkBuildingRestoreResult) => void = () => {};
  mockRestore.mockImplementation((_target, _strategy, onQueued) => {
    onQueued?.();
    return new Promise((resolve) => { finish = resolve; });
  });
  const { onRestored } = renderPanel();
  await screen.findByText("2 cells");

  fireEvent.click(screen.getByRole("button", { name: "Restore" }));
  confirmRestore(/to how they were before this paste/);

  expect(await screen.findByText(/being restored in the background/)).toBeInTheDocument();

  const reload_result = { ...restored_result, data: [], reload_required: true };
  finish(reload_result);

  await waitFor(() => expect(onRestored).toHaveBeenCalledWith(reload_result));
  await waitFor(() => expect(screen.queryByText(/being restored in the background/)).not.toBeInTheDocument());
});

it("asks what to do with cells edited again since, then overwrites them when asked", async () => {
  mockRestore
    .mockResolvedValueOnce({
      ...restored_result,
      applied: false,
      restored_cells: 0,
      data: [],
      conflicts: [{
        placement_id: "p1",
        order_id: "BL-25730",
        field: "keyword",
        current_value: "fixed by hand",
        expected_value: "senior living",
        restore_value: "other fatigue icd 10",
      }],
      conflicts_count: 120,
    })
    .mockResolvedValueOnce(restored_result);
  const { onRestored } = renderPanel();
  await screen.findByText("2 cells");

  fireEvent.click(screen.getByRole("button", { name: "Restore" }));
  confirmRestore(/to how they were before this paste/);

  expect(await screen.findByText(/120 cells were edited again after this change/)).toBeInTheDocument();
  expect(screen.getByText(/fixed by hand/)).toBeInTheDocument();
  expect(screen.getByText("and 119 more")).toBeInTheDocument();
  expect(onRestored).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: "Overwrite them too" }));

  await waitFor(() => expect(mockRestore).toHaveBeenLastCalledWith({ batch_id: "batch-paste" }, "overwrite", expect.any(Function)));
  expect(onRestored).toHaveBeenCalledWith(restored_result);
});

it("shows the edit history of one row and restores a single change", async () => {
  mockRowHistory.mockResolvedValue({ data: [paste_revision], meta: list_meta, order_id: "BL-25730", is_deleted: false });
  mockRestore.mockResolvedValue(restored_result);
  const { onShowAllChanges } = renderPanel({ row_id: "p1" });

  expect(await screen.findByRole("heading", { name: "Edit history · BL-25730" })).toBeInTheDocument();
  expect(mockList).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: "Restore" }));
  confirmRestore(/Restore these 2 cells of BL-25730/);
  await waitFor(() => expect(mockRestore).toHaveBeenCalledWith({ revision_id: 11 }, "abort", expect.any(Function)));

  fireEvent.click(screen.getByRole("button", { name: "Show all changes" }));
  expect(onShowAllChanges).toHaveBeenCalled();
});

it("closes on Escape", async () => {
  const { onClose } = renderPanel();
  await screen.findByText("2 cells");

  fireEvent.keyDown(document, { key: "Escape" });

  expect(onClose).toHaveBeenCalled();
});
