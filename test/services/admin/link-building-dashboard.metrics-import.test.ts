/**
 * Tests for the file upload functions of the admin link-building-dashboard
 * service: the partnership metrics update (VLOOKUP by Partnership), the Order ID
 * metrics update and the full order import. All of them go through the same
 * XMLHttpRequest helper, so a fake XMLHttpRequest checks the endpoint, headers,
 * form fields, upload progress and error handling without any network call.
 */

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get:    jest.fn(),
    post:   jest.fn(),
    put:    jest.fn(),
    delete: jest.fn(),
  },
  getToken: jest.fn(() => "test-token"),
}));

import { apiClient, getToken } from "@/lib/api-client";
import {
  importPartnershipMetrics,
  getPartnershipMetricsSummary,
  metricsImportLinkBuildingOrders,
  importLinkBuildingOrders,
  PARTNERSHIP_METRIC_COLUMN_OPTIONS,
  SITE_REMOVED_VALUE,
} from "@/services/admin/link-building-dashboard.service";

const mocked_api = apiClient as jest.Mocked<typeof apiClient>;
const mocked_get_token = getToken as jest.MockedFunction<typeof getToken>;

// ─── Fake XMLHttpRequest ─────────────────────────────────────────────────────

type Listener = (event: { lengthComputable: boolean; loaded: number; total: number }) => void;

class FakeXhr {
  static instances: FakeXhr[] = [];

  method = "";
  url = "";
  headers: Record<string, string> = {};
  body: FormData | null = null;
  status = 0;
  responseText = "";

  private listeners: Record<string, Array<() => void>> = {};
  private upload_listeners: Record<string, Listener[]> = {};

  upload = {
    addEventListener: (type: string, listener: Listener) => {
      (this.upload_listeners[type] ??= []).push(listener);
    },
  };

  constructor() {
    FakeXhr.instances.push(this);
  }

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }

  addEventListener(type: string, listener: () => void) {
    (this.listeners[type] ??= []).push(listener);
  }

  send(body: FormData) {
    this.body = body;
  }

  // ── Test controls ──

  emitProgress(loaded: number, total: number, length_computable = true) {
    this.upload_listeners.progress?.forEach((listener) => listener({ lengthComputable: length_computable, loaded, total }));
  }

  respond(status: number, response_text: string) {
    this.status = status;
    this.responseText = response_text;
    this.listeners.load?.forEach((listener) => listener());
  }

  fail(type: "error" | "abort") {
    this.listeners[type]?.forEach((listener) => listener());
  }
}

const original_xhr = global.XMLHttpRequest;

beforeEach(() => {
  jest.clearAllMocks();
  mocked_get_token.mockReturnValue("test-token");
  FakeXhr.instances = [];
  global.XMLHttpRequest = FakeXhr as unknown as typeof XMLHttpRequest;
});

afterAll(() => {
  global.XMLHttpRequest = original_xhr;
});

function lastXhr(): FakeXhr {
  const xhr = FakeXhr.instances.at(-1);
  if (!xhr) throw new Error("No XMLHttpRequest was created");
  return xhr;
}

function csvFile(name = "metrics.csv"): File {
  return new File(["Partnership,DR\ntechkaya.com,74\n"], name, { type: "text/csv" });
}

const START_RESPONSE = JSON.stringify({ message: "Queued", import_id: "import-1", total: 0 });

// ─── Constants ───────────────────────────────────────────────────────────────

describe("PARTNERSHIP_METRIC_COLUMN_OPTIONS", () => {
  it("lists the four Link Table columns the backend fills by Partnership", () => {
    expect(PARTNERSHIP_METRIC_COLUMN_OPTIONS.map((col) => col.key)).toEqual([
      "dr_formula",
      "current_traffic",
      "current_poc",
      "current_price",
    ]);
  });

  it("matches the value the backend writes for removed sites", () => {
    expect(SITE_REMOVED_VALUE).toBe("SITE REMOVED");
  });
});

// ─── importPartnershipMetrics ────────────────────────────────────────────────

describe("importPartnershipMetrics", () => {
  it("posts the file, columns, date range and removal option to the partnership endpoint", async () => {
    const file = csvFile();
    const promise = importPartnershipMetrics(file, ["dr_formula", "current_poc"], {
      date_from: "08/21/2026",
      date_to: "10/21/2026",
      mark_missing_as_removed: true,
    });

    const xhr = lastXhr();
    expect(xhr.method).toBe("POST");
    expect(xhr.url).toMatch(/\/api\/admin\/link-building-orders\/partnership-metrics-import$/);
    expect(xhr.body?.get("file")).toBe(file);
    expect(xhr.body?.getAll("target_columns[]")).toEqual(["dr_formula", "current_poc"]);
    expect(xhr.body?.get("date_from")).toBe("08/21/2026");
    expect(xhr.body?.get("date_to")).toBe("10/21/2026");
    expect(xhr.body?.get("mark_missing_as_removed")).toBe("1");

    xhr.respond(202, START_RESPONSE);
    await expect(promise).resolves.toEqual({ message: "Queued", import_id: "import-1", total: 0 });
  });

  it("sends 0 when missing partnerships must not be marked as removed", () => {
    importPartnershipMetrics(csvFile(), ["current_price"], { mark_missing_as_removed: false });

    expect(lastXhr().body?.get("mark_missing_as_removed")).toBe("0");
  });

  it("leaves the dates out when none are given, so the backend default window applies", () => {
    importPartnershipMetrics(csvFile(), ["current_price"], { mark_missing_as_removed: true });

    const body = lastXhr().body!;
    expect(body.has("date_from")).toBe(false);
    expect(body.has("date_to")).toBe(false);
  });

  it("sends the bearer token and asks for JSON", () => {
    importPartnershipMetrics(csvFile(), ["current_price"], { mark_missing_as_removed: true });

    expect(lastXhr().headers).toEqual({
      Authorization: "Bearer test-token",
      Accept: "application/json",
    });
  });

  it("omits the Authorization header when there is no token", () => {
    mocked_get_token.mockReturnValue(null);
    importPartnershipMetrics(csvFile(), ["current_price"], { mark_missing_as_removed: true });

    expect(lastXhr().headers).not.toHaveProperty("Authorization");
  });

  it("reports the upload progress as a rounded percentage", () => {
    const on_progress = jest.fn();
    importPartnershipMetrics(csvFile(), ["current_price"], { mark_missing_as_removed: true }, on_progress);

    const xhr = lastXhr();
    xhr.emitProgress(1, 3);
    xhr.emitProgress(3, 3);
    xhr.emitProgress(5, 0, false);

    expect(on_progress.mock.calls).toEqual([[33], [100]]);
  });

  it("rejects with the validation errors of the API", async () => {
    const promise = importPartnershipMetrics(csvFile(), ["current_price"], { mark_missing_as_removed: true });
    const error_body = { message: "The given data was invalid.", errors: { file: ["The file field is required."] } };

    lastXhr().respond(422, JSON.stringify(error_body));

    await expect(promise).rejects.toEqual(error_body);
  });

  it("rejects with a status message when the error body is not JSON", async () => {
    const promise = importPartnershipMetrics(csvFile(), ["current_price"], { mark_missing_as_removed: true });

    lastXhr().respond(500, "<html>Server Error</html>");

    await expect(promise).rejects.toThrow("Upload failed with status 500.");
  });

  it("rejects when a successful response is not JSON", async () => {
    const promise = importPartnershipMetrics(csvFile(), ["current_price"], { mark_missing_as_removed: true });

    lastXhr().respond(202, "not json");

    await expect(promise).rejects.toThrow("Invalid response from server.");
  });

  it.each([
    ["error", "Network error during upload."],
    ["abort", "Upload was cancelled."],
  ] as const)("rejects on a network %s", async (type, message) => {
    const promise = importPartnershipMetrics(csvFile(), ["current_price"], { mark_missing_as_removed: true });

    lastXhr().fail(type);

    await expect(promise).rejects.toThrow(message);
  });
});

// ─── getPartnershipMetricsSummary ────────────────────────────────────────────

describe("getPartnershipMetricsSummary", () => {
  it("GETs the summary endpoint and unwraps the data envelope", async () => {
    const summary = {
      total_domains: 3982,
      metrics_domains: 3950,
      listed_partners: 1204,
      last_metrics_sync: "2026-10-01T09:00:00+00:00",
      last_partner_sync: null,
    };
    mocked_api.get.mockResolvedValue({ data: summary });

    await expect(getPartnershipMetricsSummary()).resolves.toEqual(summary);
    expect(mocked_api.get).toHaveBeenCalledWith("/api/admin/link-building-orders/partnership-metrics/summary");
  });
});

// ─── Existing uploads that share the helper ──────────────────────────────────

describe("metricsImportLinkBuildingOrders (match by Order ID)", () => {
  it("still posts to the Order ID metrics endpoint with its own fields", async () => {
    const promise = metricsImportLinkBuildingOrders(csvFile(), ["current_traffic", "final_price"], {
      date_from: "09/21/2026",
    });

    const xhr = lastXhr();
    expect(xhr.url).toMatch(/\/api\/admin\/link-building-orders\/metrics-import$/);
    expect(xhr.body?.getAll("target_columns[]")).toEqual(["current_traffic", "final_price"]);
    expect(xhr.body?.get("date_from")).toBe("09/21/2026");
    expect(xhr.body?.has("date_to")).toBe(false);
    expect(xhr.body?.has("mark_missing_as_removed")).toBe(false);

    xhr.respond(202, START_RESPONSE);
    await expect(promise).resolves.toMatchObject({ import_id: "import-1" });
  });
});

describe("importLinkBuildingOrders (full order import)", () => {
  it("still posts every import option to the import endpoint", async () => {
    const promise = importLinkBuildingOrders(csvFile("orders.csv"), {
      apply_date_filter: true,
      date_from: "01/01/2026",
      date_to: "10/21/2026",
      link_type_filter: "all",
      only_new_records: true,
    });

    const xhr = lastXhr();
    expect(xhr.url).toMatch(/\/api\/admin\/link-building-orders\/import$/);
    expect(xhr.body?.get("apply_date_filter")).toBe("1");
    expect(xhr.body?.get("date_from")).toBe("01/01/2026");
    expect(xhr.body?.get("date_to")).toBe("10/21/2026");
    expect(xhr.body?.get("link_type_filter")).toBe("all");
    expect(xhr.body?.get("only_new_records")).toBe("1");

    xhr.respond(202, START_RESPONSE);
    await expect(promise).resolves.toMatchObject({ import_id: "import-1" });
  });

  it("leaves the dates out when the date filter is off", () => {
    importLinkBuildingOrders(csvFile("orders.csv"), {
      apply_date_filter: false,
      date_from: "01/01/2026",
      link_type_filter: "external_only",
      only_new_records: false,
    });

    const body = lastXhr().body!;
    expect(body.get("apply_date_filter")).toBe("0");
    expect(body.has("date_from")).toBe(false);
  });
});
