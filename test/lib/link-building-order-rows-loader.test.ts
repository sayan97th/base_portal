import {
  FIRST_ROWS_COUNT,
  ROWS_BATCH_CONCURRENCY,
  ROWS_BATCH_SIZE,
  ROW_CACHE_TTL_MS,
  createOrderRowCache,
  loadAllLinkBuildingOrderRows,
  type OrderRowCache,
} from "@/lib/link-building-order-rows-loader";
import {
  getLinkBuildingOrderRowsByIds,
  listLinkBuildingOrders,
} from "@/services/admin/link-building-dashboard.service";
import type { LinkBuildingOrderRow, LinkBuildingOrdersResponse } from "@/types/admin/link-building-order";

jest.mock("@/services/admin/link-building-dashboard.service", () => ({
  listLinkBuildingOrders: jest.fn(),
  getLinkBuildingOrderRowsByIds: jest.fn(),
}));

const mockListLinkBuildingOrders = listLinkBuildingOrders as jest.MockedFunction<typeof listLinkBuildingOrders>;
const mockGetRowsByIds = getLinkBuildingOrderRowsByIds as jest.MockedFunction<typeof getLinkBuildingOrderRowsByIds>;

function makeRow(index: number, overrides: Partial<LinkBuildingOrderRow> = {}): LinkBuildingOrderRow {
  return { id: `id-${index}`, order_id: `BL-${index}`, keyword: `keyword ${index}`, ...overrides } as LinkBuildingOrderRow;
}

function makeRows(count: number): LinkBuildingOrderRow[] {
  return Array.from({ length: count }, (_, index) => makeRow(index));
}

/** A search response for `rows`, the first FIRST_ROWS_COUNT of them in `data`, all of them in the index. */
function searchResponse(rows: LinkBuildingOrderRow[], versions?: number[]): LinkBuildingOrdersResponse {
  return {
    data: rows.slice(0, FIRST_ROWS_COUNT),
    current_page: 1,
    last_page: 1,
    per_page: FIRST_ROWS_COUNT,
    total: rows.length,
    from: rows.length > 0 ? 1 : null,
    to: Math.min(rows.length, FIRST_ROWS_COUNT),
    row_index: { ids: rows.map((row) => row.id), versions: versions ?? rows.map(() => 1) },
  };
}

/** Serves rows by id from `rows`, like the rows endpoint. */
function serveRowsFrom(rows: LinkBuildingOrderRow[]) {
  const by_id = new Map(rows.map((row) => [row.id, row]));
  mockGetRowsByIds.mockImplementation(async (ids) =>
    ids.map((id) => by_id.get(id)).filter((row): row is LinkBuildingOrderRow => row !== undefined)
  );
}

async function loadRows(cache: OrderRowCache = createOrderRowCache(), now = () => 1_000) {
  const handed_over: LinkBuildingOrderRow[] = [];
  let total = -1;
  await loadAllLinkBuildingOrderRows({
    body: { status: "Live" },
    cache,
    isCancelled: () => false,
    onFirstRows: (rows, server_total) => {
      handed_over.push(...rows);
      total = server_total;
    },
    onMoreRows: (rows) => handed_over.push(...rows),
    now,
  });
  return { handed_over, total };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("loadAllLinkBuildingOrderRows", () => {
  it("asks for the first rows and the row index with the current filters", async () => {
    const rows = makeRows(3);
    mockListLinkBuildingOrders.mockResolvedValue(searchResponse(rows));

    await loadRows();

    expect(mockListLinkBuildingOrders).toHaveBeenCalledWith({
      status: "Live",
      page: 1,
      per_page: FIRST_ROWS_COUNT,
      include_row_index: true,
    });
  });

  it("hands over a small result set with the first request only", async () => {
    const rows = makeRows(3);
    mockListLinkBuildingOrders.mockResolvedValue(searchResponse(rows));

    const { handed_over, total } = await loadRows();

    expect(handed_over).toEqual(rows);
    expect(total).toBe(3);
    expect(mockGetRowsByIds).not.toHaveBeenCalled();
  });

  it("loads the rest of a large result set in batches and hands every row over in display order", async () => {
    const rows = makeRows(FIRST_ROWS_COUNT + ROWS_BATCH_SIZE * 2 + 50);
    mockListLinkBuildingOrders.mockResolvedValue(searchResponse(rows));
    serveRowsFrom(rows);

    const { handed_over, total } = await loadRows();

    expect(total).toBe(rows.length);
    expect(handed_over.map((row) => row.id)).toEqual(rows.map((row) => row.id));
    expect(mockGetRowsByIds).toHaveBeenCalledTimes(3);
    mockGetRowsByIds.mock.calls.forEach(([ids]) => expect(ids.length).toBeLessThanOrEqual(ROWS_BATCH_SIZE));
  });

  it("keeps the display order when a later batch answers first", async () => {
    const rows = makeRows(FIRST_ROWS_COUNT + ROWS_BATCH_SIZE + 10);
    mockListLinkBuildingOrders.mockResolvedValue(searchResponse(rows));
    const by_id = new Map(rows.map((row) => [row.id, row]));
    let release_first_batch!: () => void;
    const first_batch_gate = new Promise<void>((resolve) => {
      release_first_batch = resolve;
    });
    mockGetRowsByIds.mockImplementation(async (ids) => {
      if (ids[0] === rows[FIRST_ROWS_COUNT].id) await first_batch_gate;
      else setTimeout(release_first_batch, 0);
      return ids.map((id) => by_id.get(id)!);
    });

    const { handed_over } = await loadRows();

    expect(handed_over.map((row) => row.id)).toEqual(rows.map((row) => row.id));
  });

  it("reuses cached rows whose version did not change instead of downloading them again", async () => {
    const rows = makeRows(FIRST_ROWS_COUNT + 20);
    const cache = createOrderRowCache();
    mockListLinkBuildingOrders.mockResolvedValue(searchResponse(rows));
    serveRowsFrom(rows);
    await loadRows(cache);
    mockGetRowsByIds.mockClear();

    // Same orders, one of them edited meanwhile.
    const versions = rows.map(() => 1);
    versions[FIRST_ROWS_COUNT + 5] = 2;
    mockListLinkBuildingOrders.mockResolvedValue(searchResponse(rows, versions));

    const { handed_over } = await loadRows(cache, () => 2_000);

    expect(mockGetRowsByIds).toHaveBeenCalledTimes(1);
    expect(mockGetRowsByIds).toHaveBeenCalledWith([rows[FIRST_ROWS_COUNT + 5].id]);
    expect(handed_over).toHaveLength(rows.length);
  });

  it("downloads cached rows again once they are older than the cache lifetime", async () => {
    const rows = makeRows(FIRST_ROWS_COUNT + 20);
    const cache = createOrderRowCache();
    mockListLinkBuildingOrders.mockResolvedValue(searchResponse(rows));
    serveRowsFrom(rows);
    await loadRows(cache, () => 0);
    mockGetRowsByIds.mockClear();

    await loadRows(cache, () => ROW_CACHE_TTL_MS + 1);

    expect(mockGetRowsByIds).toHaveBeenCalledTimes(1);
    expect(mockGetRowsByIds.mock.calls[0][0]).toHaveLength(20);
  });

  it("leaves out rows deleted between the index and their batch", async () => {
    const rows = makeRows(FIRST_ROWS_COUNT + 3);
    mockListLinkBuildingOrders.mockResolvedValue(searchResponse(rows));
    const deleted_id = rows[FIRST_ROWS_COUNT + 1].id;
    serveRowsFrom(rows.filter((row) => row.id !== deleted_id));

    const { handed_over } = await loadRows();

    expect(handed_over.map((row) => row.id)).toEqual(rows.filter((row) => row.id !== deleted_id).map((row) => row.id));
  });

  it("hands nothing over once a newer load cancelled it", async () => {
    const rows = makeRows(FIRST_ROWS_COUNT + 5);
    mockListLinkBuildingOrders.mockResolvedValue(searchResponse(rows));
    serveRowsFrom(rows);
    const onFirstRows = jest.fn();
    const onMoreRows = jest.fn();

    await loadAllLinkBuildingOrderRows({
      body: {},
      cache: createOrderRowCache(),
      isCancelled: () => true,
      onFirstRows,
      onMoreRows,
    });

    expect(onFirstRows).not.toHaveBeenCalled();
    expect(onMoreRows).not.toHaveBeenCalled();
    expect(mockGetRowsByIds).not.toHaveBeenCalled();
  });

  it("retries a failed batch once before giving up", async () => {
    const rows = makeRows(FIRST_ROWS_COUNT + 5);
    mockListLinkBuildingOrders.mockResolvedValue(searchResponse(rows));
    serveRowsFrom(rows);
    mockGetRowsByIds.mockRejectedValueOnce(new Error("timeout"));

    const { handed_over } = await loadRows();

    expect(mockGetRowsByIds).toHaveBeenCalledTimes(2);
    expect(handed_over).toHaveLength(rows.length);
  });

  it("rejects when a batch keeps failing, after handing over the first rows", async () => {
    const rows = makeRows(FIRST_ROWS_COUNT + 5);
    mockListLinkBuildingOrders.mockResolvedValue(searchResponse(rows));
    mockGetRowsByIds.mockRejectedValue(new Error("server error"));
    const onFirstRows = jest.fn();

    await expect(
      loadAllLinkBuildingOrderRows({
        body: {},
        cache: createOrderRowCache(),
        isCancelled: () => false,
        onFirstRows,
        onMoreRows: jest.fn(),
      })
    ).rejects.toThrow("server error");
    expect(onFirstRows).toHaveBeenCalledWith(rows.slice(0, FIRST_ROWS_COUNT), rows.length);
  });

  it("treats a response without a row index as the whole result set", async () => {
    const rows = makeRows(2);
    mockListLinkBuildingOrders.mockResolvedValue({ ...searchResponse(rows), row_index: undefined });

    const { handed_over, total } = await loadRows();

    expect(handed_over).toEqual(rows);
    expect(total).toBe(2);
  });

  it("hands over an empty result set without any follow up request", async () => {
    mockListLinkBuildingOrders.mockResolvedValue(searchResponse([]));

    const { handed_over, total } = await loadRows();

    expect(handed_over).toEqual([]);
    expect(total).toBe(0);
    expect(mockGetRowsByIds).not.toHaveBeenCalled();
  });

  it("never has more batches in flight than the concurrency limit", async () => {
    const rows = makeRows(FIRST_ROWS_COUNT + ROWS_BATCH_SIZE * (ROWS_BATCH_CONCURRENCY + 3));
    mockListLinkBuildingOrders.mockResolvedValue(searchResponse(rows));
    const by_id = new Map(rows.map((row) => [row.id, row]));
    let in_flight = 0;
    let max_in_flight = 0;
    mockGetRowsByIds.mockImplementation(async (ids) => {
      in_flight++;
      max_in_flight = Math.max(max_in_flight, in_flight);
      await new Promise((resolve) => setTimeout(resolve, 1));
      in_flight--;
      return ids.map((id) => by_id.get(id)!);
    });

    const { handed_over } = await loadRows();

    expect(max_in_flight).toBe(ROWS_BATCH_CONCURRENCY);
    expect(handed_over).toHaveLength(rows.length);
  });

  it("stops asking for batches once it is cancelled half way", async () => {
    const rows = makeRows(FIRST_ROWS_COUNT + ROWS_BATCH_SIZE * (ROWS_BATCH_CONCURRENCY * 2));
    mockListLinkBuildingOrders.mockResolvedValue(searchResponse(rows));
    const by_id = new Map(rows.map((row) => [row.id, row]));
    let is_cancelled = false;
    mockGetRowsByIds.mockImplementation(async (ids) => {
      await Promise.resolve();
      // A newer filter arrives while the first round of batches is in flight.
      is_cancelled = true;
      return ids.map((id) => by_id.get(id)!);
    });
    const onMoreRows = jest.fn();

    await loadAllLinkBuildingOrderRows({
      body: {},
      cache: createOrderRowCache(),
      isCancelled: () => is_cancelled,
      onFirstRows: jest.fn(),
      onMoreRows,
    });

    expect(mockGetRowsByIds).toHaveBeenCalledTimes(ROWS_BATCH_CONCURRENCY);
    expect(onMoreRows).not.toHaveBeenCalled();
  });

  it("does not wait for a row deleted among the first rows", async () => {
    const rows = makeRows(FIRST_ROWS_COUNT + 3);
    const response = searchResponse(rows);
    // The second row was deleted between the index query and the first rows query.
    response.data = response.data.filter((row) => row.id !== rows[1].id);
    mockListLinkBuildingOrders.mockResolvedValue(response);
    serveRowsFrom(rows);

    const { handed_over } = await loadRows();

    expect(handed_over.map((row) => row.id)).toEqual(rows.filter((row) => row.id !== rows[1].id).map((row) => row.id));
    // The deleted row is not asked for again.
    expect(mockGetRowsByIds.mock.calls.flatMap(([ids]) => ids)).not.toContain(rows[1].id);
  });

  it("caches the rows it loads under their index version", async () => {
    const rows = makeRows(FIRST_ROWS_COUNT + 2);
    const cache = createOrderRowCache();
    mockListLinkBuildingOrders.mockResolvedValue(searchResponse(rows, rows.map((_, idx) => 100 + idx)));
    serveRowsFrom(rows);

    await loadRows(cache, () => 5_000);

    expect(cache.size).toBe(rows.length);
    expect(cache.get(rows[FIRST_ROWS_COUNT + 1].id)).toEqual({
      row: rows[FIRST_ROWS_COUNT + 1],
      version: 100 + FIRST_ROWS_COUNT + 1,
      cached_at: 5_000,
    });
  });

  it("drops expired rows from the cache when a new load starts", async () => {
    const cache = createOrderRowCache();
    cache.set("stale-id", { row: makeRow(999), version: 1, cached_at: 0 });
    mockListLinkBuildingOrders.mockResolvedValue(searchResponse(makeRows(1)));

    await loadRows(cache, () => ROW_CACHE_TTL_MS + 10);

    expect(cache.has("stale-id")).toBe(false);
  });

  it("always takes the first rows from the server, even when cached", async () => {
    const rows = makeRows(2);
    const cache = createOrderRowCache();
    cache.set(rows[0].id, { row: { ...rows[0], keyword: "old cached keyword" }, version: 1, cached_at: 1_000 });
    mockListLinkBuildingOrders.mockResolvedValue(searchResponse(rows));

    const { handed_over } = await loadRows(cache, () => 1_000);

    expect(handed_over[0].keyword).toBe(rows[0].keyword);
  });
});
