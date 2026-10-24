/**
 * Tests for the version history panel of the Link Building Orders table: it lists
 * every action with its cell changes, and restores one after confirmation, asking
 * what to do with cells that were edited again since.
 */

import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import LinkBuildingOrderHistoryPanel from "@/components/admin/dashboard/LinkBuildingOrderHistoryPanel";
import type { LinkBuildingHistoryBatch } from "@/types/admin/link-building-order-history";

jest.mock("@/services/admin/link-building-order-history.service", () => ({
  listLinkBuildingOrderHistory: jest.fn(),
  getLinkBuildingOrderHistoryBatch: jest.fn(),
  getLinkBuildingOrderRowHistory: jest.fn(),
  restoreLinkBuildingOrderHistory: jest.fn(),
}));

import {
  getLinkBuildingOrderRowHistory,
  listLinkBuildingOrderHistory,
  restoreLinkBuildingOrderHistory,
} from "@/services/admin/link-building-order-history.service";

const mockList = listLinkBuildingOrderHistory as jest.MockedFunction<typeof listLinkBuildingOrderHistory>;
const mockRowHistory = getLinkBuildingOrderRowHistory as jest.MockedFunction<typeof getLinkBuildingOrderRowHistory>;
const mockRestore = restoreLinkBuildingOrderHistory as jest.MockedFunction<typeof restoreLinkBuildingOrderHistory>;

const COLUMN_LABELS = { client: "Company", keyword: "Keyword" };

const paste_batch: LinkBuildingHistoryBatch = {
  batch_id: "batch-paste",
  source: "paste",
  user: { id: 7, name: "Krista B" },
  started_at: new Date().toISOString(),
  revisions_count: 1,
  rows_count: 1,
  created_count: 0,
  updated_count: 1,
  deleted_count: 0,
  cells_count: 2,
  restored_batch_id: null,
  restored: null,
  has_more_revisions: false,
  revisions: [
    {
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
    },
  ],
};

const meta = { current_page: 1, last_page: 1, per_page: 20, total: 1 };

const restored_result = {
  message: "Restored 2 cell(s).",
  applied: true,
  restored_cells: 2,
  recreated_rows: 0,
  conflicts: [],
  skipped: [],
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

beforeEach(() => {
  jest.clearAllMocks();
  mockList.mockResolvedValue({ data: [paste_batch], meta });
});

it("lists each action with who made it and the old and new value of each cell", async () => {
  renderPanel();

  expect(await screen.findByText("2 cells")).toBeInTheDocument();
  expect(screen.getByText(/Krista B/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Details" }));
  expect(screen.getByText("BL-25730")).toBeInTheDocument();
  expect(screen.getByText("Company")).toBeInTheDocument();
  expect(screen.getByText("Weave")).toBeInTheDocument();
  expect(screen.getByText("Mather")).toBeInTheDocument();
});

it("filters the history by change type", async () => {
  renderPanel();
  await screen.findByText("2 cells");

  fireEvent.change(screen.getByLabelText("Change type"), { target: { value: "import" } });

  await waitFor(() => expect(mockList).toHaveBeenLastCalledWith(expect.objectContaining({ source: "import" })));
});

it("restores an action after confirmation and hands the restored rows to the table", async () => {
  mockRestore.mockResolvedValue(restored_result);
  const { onRestored } = renderPanel();
  await screen.findByText("2 cells");

  fireEvent.click(screen.getByRole("button", { name: "Restore" }));
  expect(screen.getByText(/to how they were before this paste/)).toBeInTheDocument();
  expect(mockRestore).not.toHaveBeenCalled();

  const prompt = screen.getByText(/to how they were before this paste/).parentElement as HTMLElement;
  fireEvent.click(within(prompt).getByRole("button", { name: "Restore" }));

  await waitFor(() => expect(mockRestore).toHaveBeenCalledWith({ batch_id: "batch-paste" }, "abort"));
  expect(onRestored).toHaveBeenCalledWith(restored_result);
  expect(await screen.findByText("Restored 2 cell(s).")).toBeInTheDocument();
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
    })
    .mockResolvedValueOnce(restored_result);
  const { onRestored } = renderPanel();
  await screen.findByText("2 cells");

  fireEvent.click(screen.getByRole("button", { name: "Restore" }));
  const prompt = screen.getByText(/to how they were before this paste/).parentElement as HTMLElement;
  fireEvent.click(within(prompt).getByRole("button", { name: "Restore" }));

  expect(await screen.findByText(/1 cell was edited again after this change/)).toBeInTheDocument();
  expect(screen.getByText(/fixed by hand/)).toBeInTheDocument();
  expect(onRestored).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: "Overwrite them too" }));

  await waitFor(() => expect(mockRestore).toHaveBeenLastCalledWith({ batch_id: "batch-paste" }, "overwrite"));
  expect(onRestored).toHaveBeenCalledWith(restored_result);
});

it("shows the edit history of one row and restores a single change", async () => {
  mockRowHistory.mockResolvedValue({ data: paste_batch.revisions, meta, order_id: "BL-25730", is_deleted: false });
  mockRestore.mockResolvedValue(restored_result);
  const { onShowAllChanges } = renderPanel({ row_id: "p1" });

  expect(await screen.findByRole("heading", { name: "Edit history · BL-25730" })).toBeInTheDocument();
  expect(mockList).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: "Restore" }));
  expect(screen.getByText(/Restore these 2 cells of BL-25730/)).toBeInTheDocument();
  const prompt = screen.getByText(/Restore these 2 cells of BL-25730/).parentElement as HTMLElement;
  fireEvent.click(within(prompt).getByRole("button", { name: "Restore" }));
  await waitFor(() => expect(mockRestore).toHaveBeenCalledWith({ revision_id: 11 }, "abort"));

  fireEvent.click(screen.getByRole("button", { name: "Show all changes" }));
  expect(onShowAllChanges).toHaveBeenCalled();
});

it("closes on Escape", async () => {
  const { onClose } = renderPanel();
  await screen.findByText("2 cells");

  fireEvent.keyDown(document, { key: "Escape" });

  expect(onClose).toHaveBeenCalled();
});
