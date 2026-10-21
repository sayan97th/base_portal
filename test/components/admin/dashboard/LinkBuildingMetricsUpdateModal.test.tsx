/**
 * Tests for the "Update Metrics" dialog of the admin Link Building Orders table:
 *  - matching by Partnership (default, the VLOOKUP replacement): reference list
 *    summary, columns, two month default window, SITE REMOVED option, template;
 *  - matching by Order ID (the original flow) still sending its own request;
 *  - the upload, polling, completed and failed phases.
 */

import React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import LinkBuildingMetricsUpdateModal from "@/components/admin/dashboard/LinkBuildingMetricsUpdateModal";
import {
  importPartnershipMetrics,
  metricsImportLinkBuildingOrders,
  getPartnershipMetricsSummary,
  getLinkBuildingImportStatus,
  type ImportStatus,
  type PartnershipMetricsSummary,
} from "@/services/admin/link-building-dashboard.service";

// ─── Module mocks ────────────────────────────────────────────────────────────

jest.mock("@/services/admin/link-building-dashboard.service", () => {
  const actual = jest.requireActual("@/services/admin/link-building-dashboard.service");
  return {
    ...actual,
    importPartnershipMetrics: jest.fn(),
    metricsImportLinkBuildingOrders: jest.fn(),
    getPartnershipMetricsSummary: jest.fn(),
    getLinkBuildingImportStatus: jest.fn(),
  };
});

// flatpickr does not run in jsdom, a plain input keeps the ISO value contract.
jest.mock("@/components/admin/users/FilterDatePicker", () => ({
  __esModule: true,
  default: ({ id, value, on_change }: { id: string; value: string; on_change: (value: string) => void }) => (
    <input data-testid={id} value={value} onChange={(e) => on_change(e.target.value)} />
  ),
}));

const mockImportPartnershipMetrics = importPartnershipMetrics as jest.MockedFunction<typeof importPartnershipMetrics>;
const mockMetricsImport = metricsImportLinkBuildingOrders as jest.MockedFunction<typeof metricsImportLinkBuildingOrders>;
const mockGetSummary = getPartnershipMetricsSummary as jest.MockedFunction<typeof getPartnershipMetricsSummary>;
const mockGetImportStatus = getLinkBuildingImportStatus as jest.MockedFunction<typeof getLinkBuildingImportStatus>;

// ─── Fixtures ────────────────────────────────────────────────────────────────

const SUMMARY: PartnershipMetricsSummary = {
  total_domains: 3982,
  metrics_domains: 3950,
  listed_partners: 1204,
  last_metrics_sync: "2026-10-01T09:00:00+00:00",
  last_partner_sync: "2026-10-15T09:00:00+00:00",
};

const START_RESPONSE = { message: "Queued", import_id: "import-1", total: 0 };

function makeStatus(overrides: Partial<ImportStatus> = {}): ImportStatus {
  return {
    status: "completed",
    total: 120,
    processed: 120,
    created: 0,
    updated: 37,
    unchanged: 60,
    skipped: 0,
    site_removed: 4,
    out_of_range: 19,
    reference_rows: 3982,
    reference_columns: ["dr", "traffic", "current_poc", "current_price"],
    errors: [],
    skipped_records: [],
    ...overrides,
  };
}

function csvFile(name = "metrics.csv"): File {
  return new File(["Partnership,DR\ntechkaya.com,74\n"], name, { type: "text/csv" });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({ now: new Date(2026, 9, 21, 10, 0, 0) });
  mockGetSummary.mockResolvedValue(SUMMARY);
  mockImportPartnershipMetrics.mockResolvedValue(START_RESPONSE);
  mockMetricsImport.mockResolvedValue(START_RESPONSE);
});

afterEach(() => {
  jest.useRealTimers();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function renderModal(props: Partial<React.ComponentProps<typeof LinkBuildingMetricsUpdateModal>> = {}) {
  const on_close = jest.fn();
  const on_import_complete = jest.fn();
  const utils = render(
    <LinkBuildingMetricsUpdateModal
      is_open
      onClose={on_close}
      onImportComplete={on_import_complete}
      {...props}
    />
  );
  // Let the reference summary request settle.
  await act(async () => {});
  return { ...utils, on_close, on_import_complete };
}

function selectFile(container: HTMLElement, file: File = csvFile()) {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
}

function startButton(): HTMLButtonElement {
  return screen.getByRole("button", { name: /start update/i }) as HTMLButtonElement;
}

async function startUpdate() {
  await act(async () => {
    fireEvent.click(startButton());
  });
}

/** Advances to the next status poll and lets its response render. */
async function pollOnce() {
  await act(async () => {
    jest.advanceTimersByTime(1500);
  });
}

function statBadgeCount(label: string): string | null {
  const label_element = screen.getByText(label);
  return within(label_element.parentElement as HTMLElement).getAllByText(/\d/)[0].textContent;
}

// ─── Rendering ───────────────────────────────────────────────────────────────

describe("LinkBuildingMetricsUpdateModal, rendering", () => {
  it("renders nothing and loads nothing while closed", async () => {
    const { container } = await renderModal({ is_open: false });

    expect(container).toBeEmptyDOMElement();
    expect(mockGetSummary).not.toHaveBeenCalled();
  });

  it("opens matching by Partnership with every partnership column checked", async () => {
    await renderModal();

    expect(screen.getByRole("radio", { name: "Match by Partnership" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText(/every order is updated by its/i)).toBeInTheDocument();
    ["DR Formula", "Current Traffic", "Current POC", "Current Price"].forEach((label) => {
      expect(screen.getByRole("checkbox", { name: new RegExp(`^${label}`) })).toBeChecked();
    });
    expect(screen.queryByRole("checkbox", { name: /Final Price/ })).not.toBeInTheDocument();
  });

  it("shows the size and last update of the partner metrics list", async () => {
    await renderModal();

    expect(mockGetSummary).toHaveBeenCalledTimes(1);
    expect(screen.getByText("3,950 domains with metrics")).toBeInTheDocument();
    expect(screen.getByText("1,204 listed partners")).toBeInTheDocument();
    expect(screen.getByText("Updated Oct 1, 2026")).toBeInTheDocument();
    expect(screen.getByText("Updated Oct 15, 2026")).toBeInTheDocument();
  });

  it("explains that the first upload creates the list when it is empty", async () => {
    mockGetSummary.mockResolvedValue({ ...SUMMARY, total_domains: 0, metrics_domains: 0, listed_partners: 0 });
    await renderModal();

    expect(screen.getByText(/No partner metrics uploaded yet/i)).toBeInTheDocument();
  });

  it("still opens when the summary request fails", async () => {
    mockGetSummary.mockRejectedValue(new Error("Network error"));
    await renderModal();

    expect(screen.getByText(/No partner metrics uploaded yet/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Update Metrics" })).toBeInTheDocument();
  });

  it("defaults the Request Date range to the last two months", async () => {
    await renderModal();

    expect(screen.getByTestId("metrics_date_from")).toHaveValue("2026-08-21");
    expect(screen.getByTestId("metrics_date_to")).toHaveValue("2026-10-21");
  });

  it("lists the recognised headers of a partnership metrics file", async () => {
    await renderModal();

    expect(screen.getByText(/Partnership, Domain, Website, Site, URL/)).toBeInTheDocument();
    expect(screen.getByText(/Current POC, POC, Publisher, Posted By/)).toBeInTheDocument();
  });
});

// ─── File selection ──────────────────────────────────────────────────────────

describe("LinkBuildingMetricsUpdateModal, file selection", () => {
  it("only offers Start Update once a file is selected", async () => {
    const { container } = await renderModal();
    expect(screen.queryByRole("button", { name: /start update/i })).not.toBeInTheDocument();

    selectFile(container);

    expect(screen.getByText("metrics.csv")).toBeInTheDocument();
    expect(startButton()).toBeEnabled();
  });

  it("rejects files that are not CSV", async () => {
    const { container } = await renderModal();

    selectFile(container, new File(["x"], "metrics.xlsx"));

    expect(screen.getByText(/Please upload a CSV file/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /start update/i })).not.toBeInTheDocument();
  });

  it("accepts a dropped file", async () => {
    await renderModal();
    const drop_zone = screen.getByText(/Drag & drop your file here/i).closest("div[class*='border-dashed']")!;

    fireEvent.drop(drop_zone, { dataTransfer: { files: [csvFile("dropped.csv")] } });

    expect(screen.getByText("dropped.csv")).toBeInTheDocument();
  });

  it("removes the selected file", async () => {
    const { container } = await renderModal();
    selectFile(container);

    fireEvent.click(screen.getByRole("button", { name: "Remove file" }));

    expect(screen.queryByText("metrics.csv")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /start update/i })).not.toBeInTheDocument();
  });

  it("downloads a CSV template with the expected headers", async () => {
    const create_object_url = jest.fn(() => "blob:template");
    const revoke_object_url = jest.fn();
    Object.assign(URL, { createObjectURL: create_object_url, revokeObjectURL: revoke_object_url });
    const click_spy = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    await renderModal();

    fireEvent.click(screen.getByRole("button", { name: "Download CSV template" }));

    const blob = (create_object_url.mock.calls[0] as unknown as [Blob])[0];
    await expect(blob.text()).resolves.toMatch(/^Partnership,DR,Traffic,Current POC,Current Price\n/);
    expect(click_spy).toHaveBeenCalledTimes(1);
    expect(revoke_object_url).toHaveBeenCalledWith("blob:template");
    click_spy.mockRestore();
  });
});

// ─── Starting the update ─────────────────────────────────────────────────────

describe("LinkBuildingMetricsUpdateModal, starting a partnership update", () => {
  it("sends the file, every column, the default range and the SITE REMOVED option", async () => {
    const { container } = await renderModal();
    const file = csvFile();
    selectFile(container, file);

    await startUpdate();

    expect(mockImportPartnershipMetrics).toHaveBeenCalledWith(
      file,
      ["dr_formula", "current_traffic", "current_poc", "current_price"],
      { date_from: "08/21/2026", date_to: "10/21/2026", mark_missing_as_removed: true },
      expect.any(Function)
    );
    expect(mockMetricsImport).not.toHaveBeenCalled();
  });

  it("sends only the checked columns and the removal option as chosen", async () => {
    const { container } = await renderModal();
    selectFile(container);

    fireEvent.click(screen.getByRole("checkbox", { name: /^DR Formula/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /^Current Traffic/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /complete partner list/i }));
    fireEvent.change(screen.getByTestId("metrics_date_from"), { target: { value: "2026-01-05" } });
    await startUpdate();

    expect(mockImportPartnershipMetrics).toHaveBeenCalledWith(
      expect.any(File),
      ["current_poc", "current_price"],
      { date_from: "01/05/2026", date_to: "10/21/2026", mark_missing_as_removed: false },
      expect.any(Function)
    );
  });

  it("sends no dates when the range is cleared", async () => {
    const { container } = await renderModal();
    selectFile(container);

    fireEvent.change(screen.getByTestId("metrics_date_from"), { target: { value: "" } });
    fireEvent.change(screen.getByTestId("metrics_date_to"), { target: { value: "" } });
    await startUpdate();

    expect(mockImportPartnershipMetrics.mock.calls[0][2]).toEqual({
      date_from: undefined,
      date_to: undefined,
      mark_missing_as_removed: true,
    });
  });

  it("blocks the update when every column is unchecked", async () => {
    const { container } = await renderModal();
    selectFile(container);

    ["DR Formula", "Current Traffic", "Current POC", "Current Price"].forEach((label) => {
      fireEvent.click(screen.getByRole("checkbox", { name: new RegExp(`^${label}`) }));
    });

    expect(screen.getByText("Select at least one column to update.")).toBeInTheDocument();
    expect(startButton()).toBeDisabled();
  });

  it("shows the upload progress reported by the service", async () => {
    let report_progress: (pct: number) => void = () => {};
    mockImportPartnershipMetrics.mockImplementation((_file, _columns, _options, on_progress) => {
      report_progress = on_progress!;
      return new Promise(() => {});
    });
    const { container } = await renderModal();
    selectFile(container);

    await startUpdate();
    act(() => report_progress(42));

    expect(screen.getByText("Uploading file…")).toBeInTheDocument();
    expect(screen.getByText("42%")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Processing…" })).toBeDisabled();
  });

  it("shows the API error when the upload is rejected", async () => {
    mockImportPartnershipMetrics.mockRejectedValue({ message: "The date from does not match the format m/d/Y." });
    const { container } = await renderModal();
    selectFile(container);

    await startUpdate();

    expect(screen.getByText("Metrics update failed")).toBeInTheDocument();
    expect(screen.getByText("The date from does not match the format m/d/Y.")).toBeInTheDocument();
  });

  it("returns to the selected file with Try Again", async () => {
    mockImportPartnershipMetrics.mockRejectedValue(new Error("Network error during upload."));
    const { container } = await renderModal();
    selectFile(container);
    await startUpdate();

    fireEvent.click(screen.getByRole("button", { name: "Try Again" }));

    expect(screen.getByText("metrics.csv")).toBeInTheDocument();
    expect(startButton()).toBeEnabled();
  });
});

// ─── Match by Order ID ───────────────────────────────────────────────────────

describe("LinkBuildingMetricsUpdateModal, matching by Order ID", () => {
  it("switches to the Order ID columns and its one month window", async () => {
    await renderModal();

    fireEvent.click(screen.getByRole("radio", { name: "Match by Order ID" }));

    expect(screen.getByText(/Rows are matched by/i)).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Final Price" })).not.toBeChecked();
    expect(screen.queryByText("Partner Metrics List")).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /complete partner list/i })).not.toBeInTheDocument();
    expect(screen.getByTestId("metrics_date_from")).toHaveValue("2026-09-21");
  });

  it("sends the update to the Order ID endpoint", async () => {
    const { container } = await renderModal();
    fireEvent.click(screen.getByRole("radio", { name: "Match by Order ID" }));
    selectFile(container);

    fireEvent.click(screen.getByRole("checkbox", { name: "Final Price" }));
    await startUpdate();

    expect(mockMetricsImport).toHaveBeenCalledWith(
      expect.any(File),
      ["current_traffic", "dr_formula", "current_poc", "current_price", "final_price"],
      { date_from: "09/21/2026", date_to: "10/21/2026" },
      expect.any(Function)
    );
    expect(mockImportPartnershipMetrics).not.toHaveBeenCalled();
  });

  it("switching back to Partnership restores its two month window", async () => {
    await renderModal();

    fireEvent.click(screen.getByRole("radio", { name: "Match by Order ID" }));
    fireEvent.click(screen.getByRole("radio", { name: "Match by Partnership" }));

    expect(screen.getByTestId("metrics_date_from")).toHaveValue("2026-08-21");
  });
});

// ─── Processing and results ──────────────────────────────────────────────────

describe("LinkBuildingMetricsUpdateModal, progress and results", () => {
  async function startAndComplete(final_status: ImportStatus) {
    mockGetImportStatus
      .mockResolvedValueOnce(makeStatus({ status: "processing", processed: 40, updated: 12, unchanged: 20 }))
      .mockResolvedValueOnce(final_status);
    const utils = await renderModal();
    selectFile(utils.container);
    await startUpdate();
    await pollOnce();
    return utils;
  }

  it("shows the domains loaded and the row progress while processing", async () => {
    await startAndComplete(makeStatus());

    expect(mockGetImportStatus).toHaveBeenCalledWith("import-1");
    expect(screen.getByText("Updating metrics…")).toBeInTheDocument();
    expect(screen.getByText(/3,982 domains loaded/)).toBeInTheDocument();
    expect(screen.getByText("40 / 120 rows")).toBeInTheDocument();
    expect(screen.getByText("12 updated")).toBeInTheDocument();
  });

  it("shows the partnership summary once the job completes", async () => {
    await startAndComplete(makeStatus());
    await pollOnce();

    expect(screen.getByText("Metrics update complete!")).toBeInTheDocument();
    expect(screen.getByText(/3,982 domains saved to the partner metrics list \(DR, Traffic, Current POC, Current Price\)/)).toBeInTheDocument();
    expect(statBadgeCount("Updated")).toBe("37");
    expect(statBadgeCount("Already up to date")).toBe("60");
    expect(statBadgeCount("Site removed")).toBe("4");
    expect(statBadgeCount("Outside date range")).toBe("19");
  });

  it("stops polling once the job completes", async () => {
    await startAndComplete(makeStatus());
    await pollOnce();
    await pollOnce();
    await pollOnce();

    expect(mockGetImportStatus).toHaveBeenCalledTimes(2);
  });

  it("lists the orders to review, like partnerships without metrics", async () => {
    await startAndComplete(makeStatus({
      skipped_records: [
        { order_id: "BL-7001", reason: 'No DR or traffic found for partnership "https://no-metrics.com", metrics kept as they were' },
      ],
    }));
    await pollOnce();

    expect(screen.getByText("Showing 1 order to review")).toBeInTheDocument();
    expect(screen.getByText("BL-7001")).toBeInTheDocument();
    expect(screen.getByText(/no-metrics\.com/)).toBeInTheDocument();
  });

  it("lists row errors returned by the job", async () => {
    await startAndComplete(makeStatus({ errors: [{ order_id: "BL-9", message: "Data too long" }] }));
    await pollOnce();

    expect(screen.getByText("1 row had errors")).toBeInTheDocument();
    expect(screen.getByText("Data too long")).toBeInTheDocument();
  });

  it("refreshes the table and closes with Close & Refresh Table", async () => {
    const { on_close, on_import_complete } = await startAndComplete(makeStatus());
    await pollOnce();

    fireEvent.click(screen.getByRole("button", { name: /Close & Refresh Table/i }));

    expect(on_close).toHaveBeenCalledTimes(1);
    expect(on_import_complete).toHaveBeenCalledTimes(1);
  });

  it("closes without refreshing with Close", async () => {
    const { on_close, on_import_complete } = await startAndComplete(makeStatus());
    await pollOnce();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(on_close).toHaveBeenCalledTimes(1);
    expect(on_import_complete).not.toHaveBeenCalled();
  });

  it("shows the job error when the update fails", async () => {
    await startAndComplete(makeStatus({
      status: "failed",
      errors: [{ order_id: "-", message: 'Metrics update failed: The file must include a "Partnership" column.' }],
    }));
    await pollOnce();

    expect(screen.getByText("Metrics update failed")).toBeInTheDocument();
    expect(screen.getByText(/must include a "Partnership" column/)).toBeInTheDocument();
  });

  it("keeps polling through a failed status request", async () => {
    mockGetImportStatus
      .mockRejectedValueOnce(new Error("Network hiccup"))
      .mockResolvedValueOnce(makeStatus());
    const { container } = await renderModal();
    selectFile(container);
    await startUpdate();

    await pollOnce();
    await pollOnce();

    expect(screen.getByText("Metrics update complete!")).toBeInTheDocument();
  });

  it("shows the Order ID results with updated and skipped counts", async () => {
    mockGetImportStatus.mockResolvedValueOnce(makeStatus({
      updated: 8,
      skipped: 2,
      skipped_records: [{ order_id: "BL-404", reason: "Order ID not found in the system" }],
    }));
    const { container } = await renderModal();
    fireEvent.click(screen.getByRole("radio", { name: "Match by Order ID" }));
    selectFile(container);
    await startUpdate();
    await pollOnce();

    expect(statBadgeCount("Updated")).toBe("8");
    expect(statBadgeCount("Skipped")).toBe("2");
    expect(screen.queryByText("Site removed")).not.toBeInTheDocument();
    expect(screen.getByText(/2 skipped, showing 1 reason/)).toBeInTheDocument();
    expect(screen.getByText(/\(1 more not shown\)/)).toBeInTheDocument();
  });
});

// ─── Closing ─────────────────────────────────────────────────────────────────

describe("LinkBuildingMetricsUpdateModal, closing", () => {
  it("resets every option when it is closed and opened again", async () => {
    const { container, on_close, rerender } = await renderModal();
    fireEvent.click(screen.getByRole("radio", { name: "Match by Order ID" }));
    selectFile(container);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(on_close).toHaveBeenCalledTimes(1);

    rerender(<LinkBuildingMetricsUpdateModal is_open onClose={on_close} onImportComplete={jest.fn()} />);
    await act(async () => {});

    expect(screen.getByRole("radio", { name: "Match by Partnership" })).toHaveAttribute("aria-checked", "true");
    expect(screen.queryByText("metrics.csv")).not.toBeInTheDocument();
    expect(screen.getByTestId("metrics_date_from")).toHaveValue("2026-08-21");
  });

  it("cannot be closed while the update is running", async () => {
    mockGetImportStatus.mockResolvedValue(makeStatus({ status: "processing" }));
    const { container, on_close } = await renderModal();
    selectFile(container);
    await startUpdate();

    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Processing…" })).toBeDisabled();
    expect(on_close).not.toHaveBeenCalled();
  });
});
