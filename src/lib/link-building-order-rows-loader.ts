/**
 * Loads every row of the Link Building Orders dashboard that matches the current
 * filters, so the spreadsheet features (totals row, formulas reading other rows,
 * select all, copy ranges, find) work on the whole result set instead of one page.
 *
 * The first request returns the first rows to paint plus the ordered ids and
 * versions of every matching row. The remaining rows are then fetched by id in
 * parallel batches and handed over in display order as soon as they line up.
 * Rows already held at the same version are reused from a cache instead of being
 * downloaded again, so changing a filter or a sort over the same orders only costs
 * the id list.
 */

import {
  getLinkBuildingOrderRowsByIds,
  listLinkBuildingOrders,
} from "@/services/admin/link-building-dashboard.service";
import type { LinkBuildingOrderRow, LinkBuildingOrderSearchBody } from "@/types/admin/link-building-order";

/** Rows of the first request, enough to fill the visible part of the grid. */
export const FIRST_ROWS_COUNT = 200;
/** Rows per follow up request, matches the API limit of the rows endpoint. */
export const ROWS_BATCH_SIZE = 1000;
/** Follow up requests in flight at once. */
export const ROWS_BATCH_CONCURRENCY = 4;
/**
 * How long a cached row is trusted. Some fields (the client company, the domain
 * usage flag, days left) can change without touching the row's updated_at, so a
 * cached row is only reused for a while even when its version still matches.
 */
export const ROW_CACHE_TTL_MS = 5 * 60 * 1000;
/** Extra attempts for a batch that fails, before the whole load gives up. */
const BATCH_RETRY_COUNT = 1;

interface CachedOrderRow {
  row: LinkBuildingOrderRow;
  version: number;
  cached_at: number;
}

export type OrderRowCache = Map<string, CachedOrderRow>;

export function createOrderRowCache(): OrderRowCache {
  return new Map();
}

interface LoadAllOrderRowsOptions {
  body: LinkBuildingOrderSearchBody;
  cache: OrderRowCache;
  /** True once a newer load started, stops this one without touching the grid. */
  isCancelled: () => boolean;
  /** The first rows in display order, with the number of rows matching the filters. */
  onFirstRows: (rows: LinkBuildingOrderRow[], total: number) => void;
  /** The next rows in display order, right after the ones handed over before. */
  onMoreRows: (rows: LinkBuildingOrderRow[]) => void;
  now?: () => number;
}

/**
 * Loads the whole result set, see the module comment. Resolves once every row was
 * handed over, or as soon as the load is cancelled. Rejects when a request fails,
 * the rows handed over until then stay valid.
 */
export async function loadAllLinkBuildingOrderRows({
  body,
  cache,
  isCancelled,
  onFirstRows,
  onMoreRows,
  now = Date.now,
}: LoadAllOrderRowsOptions): Promise<void> {
  const first = await listLinkBuildingOrders({
    ...body,
    page: 1,
    per_page: FIRST_ROWS_COUNT,
    include_row_index: true,
  });
  if (isCancelled()) return;

  const row_index = first.row_index;
  if (!row_index) {
    // An API without the row index only knows pages, the first one is all there is.
    onFirstRows(first.data, first.total);
    return;
  }

  const { ids, versions } = row_index;
  const loaded_at = now();
  pruneExpiredRows(cache, loaded_at);

  const position_by_id = new Map(ids.map((id, position) => [id, position]));
  /** Row found for each position, undefined until loaded (or forever, if deleted meanwhile). */
  const slots: (LinkBuildingOrderRow | undefined)[] = new Array(ids.length);
  /** Positions whose request came back, with or without the row. */
  const settled = new Uint8Array(ids.length);

  const fillSlot = (row: LinkBuildingOrderRow) => {
    const position = position_by_id.get(row.id);
    if (position === undefined) return;
    slots[position] = row;
    cache.set(row.id, { row, version: versions[position], cached_at: loaded_at });
  };

  // The API slices the first rows from the same index, a row missing among them was deleted meanwhile.
  first.data.forEach(fillSlot);
  for (let position = 0; position < Math.min(FIRST_ROWS_COUNT, ids.length); position++) settled[position] = 1;

  const missing_ids: string[] = [];
  ids.forEach((id, position) => {
    if (settled[position]) return;
    const cached = cache.get(id);
    if (cached && cached.version === versions[position] && loaded_at - cached.cached_at < ROW_CACHE_TTL_MS) {
      slots[position] = cached.row;
      settled[position] = 1;
    } else {
      missing_ids.push(id);
    }
  });

  let handed_over = 0;
  /** Rows of the leading settled positions not handed over yet. */
  const takeReadyRows = (): LinkBuildingOrderRow[] => {
    const ready: LinkBuildingOrderRow[] = [];
    while (handed_over < ids.length && settled[handed_over]) {
      const row = slots[handed_over];
      if (row) ready.push(row);
      handed_over++;
    }
    return ready;
  };

  onFirstRows(takeReadyRows(), ids.length);

  const batches: string[][] = [];
  for (let start = 0; start < missing_ids.length; start += ROWS_BATCH_SIZE) {
    batches.push(missing_ids.slice(start, start + ROWS_BATCH_SIZE));
  }

  await runInParallel(batches, ROWS_BATCH_CONCURRENCY, isCancelled, async (batch_ids) => {
    const rows = await withRetry(() => getLinkBuildingOrderRowsByIds(batch_ids), BATCH_RETRY_COUNT);
    if (isCancelled()) return;
    rows.forEach(fillSlot);
    batch_ids.forEach((id) => {
      const position = position_by_id.get(id);
      if (position !== undefined) settled[position] = 1;
    });
    const ready = takeReadyRows();
    if (ready.length > 0) onMoreRows(ready);
  });
}

function pruneExpiredRows(cache: OrderRowCache, now: number): void {
  cache.forEach((entry, id) => {
    if (now - entry.cached_at >= ROW_CACHE_TTL_MS) cache.delete(id);
  });
}

async function withRetry<T>(request: () => Promise<T>, retries: number): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await request();
    } catch (error) {
      if (attempt >= retries) throw error;
    }
  }
}

/**
 * Runs `work` over the items with at most `concurrency` calls in flight, started in
 * item order. The first failure stops the other workers from starting new items.
 */
async function runInParallel<T>(
  items: T[],
  concurrency: number,
  isCancelled: () => boolean,
  work: (item: T) => Promise<void>
): Promise<void> {
  let next_idx = 0;
  let has_failed = false;
  const runWorker = async () => {
    while (next_idx < items.length && !has_failed && !isCancelled()) {
      const item = items[next_idx++];
      try {
        await work(item);
      } catch (error) {
        has_failed = true;
        throw error;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runWorker));
}
