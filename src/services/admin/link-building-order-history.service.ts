import { apiClient } from "@/lib/api-client";
import type { LinkBuildingOrderRow } from "@/types/admin/link-building-order";
import type {
  LinkBuildingConflictStrategy,
  LinkBuildingHistoryBatchResponse,
  LinkBuildingHistoryFilters,
  LinkBuildingHistoryResponse,
  LinkBuildingRestoreConflict,
  LinkBuildingRestoreSkip,
  LinkBuildingRestoreTarget,
  LinkBuildingRowHistoryResponse,
} from "@/types/admin/link-building-order-history";

/**
 * GET /api/admin/link-building-orders/history
 * Actions that changed the Link Building Orders table, newest first.
 */
export async function listLinkBuildingOrderHistory(
  filters: LinkBuildingHistoryFilters = {}
): Promise<LinkBuildingHistoryResponse> {
  const params = new URLSearchParams();
  params.set("page", String(filters.page ?? 1));
  params.set("per_page", String(filters.per_page ?? 20));
  if (filters.source) params.set("source", filters.source);
  if (filters.user_id) params.set("user_id", String(filters.user_id));
  if (filters.order_id?.trim()) params.set("order_id", filters.order_id.trim());

  return apiClient.get<LinkBuildingHistoryResponse>(`/api/admin/link-building-orders/history?${params.toString()}`);
}

/**
 * GET /api/admin/link-building-orders/history/batches/{batch_id}
 * Every revision of one action, for actions larger than the list preview.
 */
export async function getLinkBuildingOrderHistoryBatch(
  batch_id: string,
  page = 1
): Promise<LinkBuildingHistoryBatchResponse> {
  return apiClient.get<LinkBuildingHistoryBatchResponse>(
    `/api/admin/link-building-orders/history/batches/${encodeURIComponent(batch_id)}?page=${page}&per_page=100`
  );
}

/**
 * GET /api/admin/link-building-orders/{id}/history
 * Edit history of one row, newest first. Works for deleted rows too.
 */
export async function getLinkBuildingOrderRowHistory(
  row_id: string,
  page = 1
): Promise<LinkBuildingRowHistoryResponse> {
  return apiClient.get<LinkBuildingRowHistoryResponse>(
    `/api/admin/link-building-orders/${encodeURIComponent(row_id)}/history?page=${page}`
  );
}

export interface LinkBuildingRestoreResult {
  message: string;
  /** False when cells were edited again since and nothing was restored (strategy "abort"). */
  applied: boolean;
  restored_cells: number;
  recreated_rows: number;
  conflicts: LinkBuildingRestoreConflict[];
  skipped: LinkBuildingRestoreSkip[];
  /** Restored and recreated rows, in the dashboard row shape. */
  data: LinkBuildingOrderRow[];
  recreated_ids: string[];
}

/**
 * POST /api/admin/link-building-orders/history/restore
 * Restores a whole action (batch_id) or a single row change (revision_id). The
 * API answers 409 with the conflicts when cells were edited again since and the
 * strategy is "abort"; that answer is returned here as a result with applied
 * false instead of being thrown, so the caller can offer to skip or overwrite.
 */
export async function restoreLinkBuildingOrderHistory(
  target: LinkBuildingRestoreTarget,
  conflict_strategy: LinkBuildingConflictStrategy = "abort"
): Promise<LinkBuildingRestoreResult> {
  try {
    return await apiClient.post<LinkBuildingRestoreResult>("/api/admin/link-building-orders/history/restore", {
      ...target,
      conflict_strategy,
    });
  } catch (err) {
    const body = err as Partial<LinkBuildingRestoreResult> & { status_code?: number };
    if (body?.status_code === 409 && Array.isArray(body.conflicts)) {
      return {
        message: body.message ?? "",
        applied: false,
        restored_cells: 0,
        recreated_rows: 0,
        conflicts: body.conflicts,
        skipped: body.skipped ?? [],
        data: [],
        recreated_ids: [],
      };
    }
    throw err;
  }
}
