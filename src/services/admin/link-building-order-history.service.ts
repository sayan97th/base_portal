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
 * Actions that changed the Link Building Orders table, newest first, as summaries.
 * Pass the id of the last action shown as before_id to load older ones.
 */
export async function listLinkBuildingOrderHistory(
  filters: LinkBuildingHistoryFilters = {}
): Promise<LinkBuildingHistoryResponse> {
  const params = new URLSearchParams();
  params.set("per_page", String(filters.per_page ?? 20));
  if (filters.before_id) params.set("before_id", String(filters.before_id));
  if (filters.source) params.set("source", filters.source);
  if (filters.user_id) params.set("user_id", String(filters.user_id));
  if (filters.order_id?.trim()) params.set("order_id", filters.order_id.trim());

  return apiClient.get<LinkBuildingHistoryResponse>(`/api/admin/link-building-orders/history?${params.toString()}`);
}

/**
 * GET /api/admin/link-building-orders/history/batches/{batch_id}
 * Revisions of one action, oldest first, a page at a time (after_id is the id of
 * the last revision already shown).
 */
export async function getLinkBuildingOrderHistoryBatch(
  batch_id: string,
  after_id: number | null = null
): Promise<LinkBuildingHistoryBatchResponse> {
  const params = new URLSearchParams({ per_page: "100" });
  if (after_id) params.set("after_id", String(after_id));

  return apiClient.get<LinkBuildingHistoryBatchResponse>(
    `/api/admin/link-building-orders/history/batches/${encodeURIComponent(batch_id)}?${params.toString()}`
  );
}

/**
 * GET /api/admin/link-building-orders/{id}/history
 * Edit history of one row, newest first (before_id is the id of the last revision
 * already shown). Works for deleted rows too.
 */
export async function getLinkBuildingOrderRowHistory(
  row_id: string,
  before_id: number | null = null
): Promise<LinkBuildingRowHistoryResponse> {
  const query = before_id ? `?before_id=${before_id}` : "";
  return apiClient.get<LinkBuildingRowHistoryResponse>(
    `/api/admin/link-building-orders/${encodeURIComponent(row_id)}/history${query}`
  );
}

export interface LinkBuildingRestoreResult {
  message: string;
  /** False when cells were edited again since and nothing was restored (strategy "abort"). */
  applied: boolean;
  restored_cells: number;
  recreated_rows: number;
  /** The first conflicts, conflicts_count has them all. */
  conflicts: LinkBuildingRestoreConflict[];
  conflicts_count: number;
  /** The first rows left out, skipped_count has them all. */
  skipped: LinkBuildingRestoreSkip[];
  skipped_count: number;
  /** Too many rows to send back: the table should reload instead, and data is empty. */
  reload_required: boolean;
  /** Restored and recreated rows, in the dashboard row shape. */
  data: LinkBuildingOrderRow[];
  recreated_ids: string[];
}

interface QueuedRestoreAnswer {
  queued: true;
  restore_id: string;
  message: string;
}

interface RestoreStatus {
  status: "queued" | "processing" | "completed" | "failed";
  result?: LinkBuildingRestoreResult;
  message?: string;
}

/** How often a background restore is checked, and for how long at most. */
const RESTORE_POLL_INTERVAL_MS = 2000;
const RESTORE_POLL_TIMEOUT_MS = 30 * 60 * 1000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * GET /api/admin/link-building-orders/history/restores/{restore_id}
 * Waits for a restore running on the queue and returns its result.
 */
async function waitForQueuedRestore(restore_id: string): Promise<LinkBuildingRestoreResult> {
  const deadline = Date.now() + RESTORE_POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await sleep(RESTORE_POLL_INTERVAL_MS);
    const status = await apiClient.get<RestoreStatus>(
      `/api/admin/link-building-orders/history/restores/${encodeURIComponent(restore_id)}`
    );
    if (status.status === "completed" && status.result) return status.result;
    if (status.status === "failed") throw { message: status.message ?? "The restore could not be completed." };
  }

  throw { message: "The restore is taking longer than expected. Check the history again in a few minutes." };
}

/**
 * POST /api/admin/link-building-orders/history/restore
 * Restores a whole action (batch_id) or a single row change (revision_id).
 *
 * The API answers 409 with the conflicts when cells were edited again since and
 * the strategy is "abort"; that answer is returned as a result with applied false
 * instead of being thrown, so the caller can offer to skip or overwrite. A large
 * action is restored on the queue (202): onQueued is called and the result is
 * returned once the background restore finishes.
 */
export async function restoreLinkBuildingOrderHistory(
  target: LinkBuildingRestoreTarget,
  conflict_strategy: LinkBuildingConflictStrategy = "abort",
  onQueued?: () => void
): Promise<LinkBuildingRestoreResult> {
  let answer: LinkBuildingRestoreResult | QueuedRestoreAnswer;
  try {
    answer = await apiClient.post<LinkBuildingRestoreResult | QueuedRestoreAnswer>(
      "/api/admin/link-building-orders/history/restore",
      { ...target, conflict_strategy }
    );
  } catch (err) {
    const body = err as Partial<LinkBuildingRestoreResult> & { status_code?: number };
    if (body?.status_code === 409 && Array.isArray(body.conflicts)) {
      return {
        message: body.message ?? "",
        applied: false,
        restored_cells: 0,
        recreated_rows: 0,
        conflicts: body.conflicts,
        conflicts_count: body.conflicts_count ?? body.conflicts.length,
        skipped: body.skipped ?? [],
        skipped_count: body.skipped_count ?? body.skipped?.length ?? 0,
        reload_required: false,
        data: [],
        recreated_ids: [],
      };
    }
    throw err;
  }

  if ("queued" in answer && answer.queued) {
    onQueued?.();
    return waitForQueuedRestore(answer.restore_id);
  }

  return answer as LinkBuildingRestoreResult;
}
