"use client";

import type { ReportTable } from "@/types/admin/order-report";
import ConfirmDeleteDialog from "@/components/ui/modal/ConfirmDeleteDialog";

interface DeleteTableConfirmModalProps {
  is_open: boolean;
  is_deleting: boolean;
  table: ReportTable | null;
  onConfirm: () => void;
  onClose: () => void;
}

function formatRowCount(row_count: number): string {
  return `${row_count} ${row_count === 1 ? "row" : "rows"}`;
}

export default function DeleteTableConfirmModal({
  is_open,
  is_deleting,
  table,
  onConfirm,
  onClose,
}: DeleteTableConfirmModalProps) {
  const row_count = table?.rows.length ?? 0;

  return (
    <ConfirmDeleteDialog
      is_open={is_open && table !== null}
      title="Delete table"
      description="The table will be removed from this order report."
      item_label="Report table"
      item_name={table?.title}
      item_meta={table?.description || formatRowCount(row_count)}
      consequences={
        row_count > 0
          ? [`All ${formatRowCount(row_count)} inside this table will be permanently removed.`]
          : []
      }
      confirm_label="Delete table"
      is_loading={is_deleting}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
}
