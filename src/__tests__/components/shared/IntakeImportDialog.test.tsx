/**
 * Tests for the shared spreadsheet-import dialog used by every intake table.
 *
 * Covers the full client flow: dropping / browsing a file, parsing it, header
 * and index-column detection, the live preview, the quantity-cap overflow
 * warning, validation errors (unsupported type, empty file) and the
 * confirm/cancel/remove interactions. These lock in the behavior the clients
 * asked for — "only the first N rows are taken; the rest are ignored".
 */

import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as XLSX from "xlsx";
import IntakeImportDialog from "@/components/shared/IntakeImportDialog";
import type { IntakeImportColumn } from "@/lib/intake-import";

const COLUMNS: IntakeImportColumn[] = [
  { label: "Keyword", aliases: ["keyword", "key phrase"] },
  { label: "Landing Page", aliases: ["landing page", "url"] },
  { label: "Exact Match", aliases: ["exact match", "exact"] },
];

// ── File helpers ───────────────────────────────────────────────────────────

function makeCsvFile(text: string, name = "import.csv"): File {
  return new File([text], name, { type: "text/csv" });
}

function makeXlsxFile(rows: (string | number)[][], name = "import.xlsx"): File {
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  return new File([buffer], name, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/** Fires a react-dropzone-compatible drop event carrying the given files. */
function dropFiles(zone: HTMLElement, files: File[]): void {
  fireEvent.drop(zone, {
    dataTransfer: {
      files,
      items: files.map((file) => ({
        kind: "file",
        type: file.type,
        getAsFile: () => file,
      })),
      types: ["Files"],
    },
  });
}

/** The react-dropzone root — the parent of its hidden file input. */
function getDropzone(container: HTMLElement): HTMLElement {
  const input = container.querySelector('input[type="file"]');
  if (!input || !input.parentElement) throw new Error("dropzone input not found");
  return input.parentElement;
}

function renderDialog(props: Partial<React.ComponentProps<typeof IntakeImportDialog>> = {}) {
  const on_import = jest.fn();
  const on_close = jest.fn();
  const utils = render(
    <IntakeImportDialog
      is_open
      on_close={on_close}
      title="Import Keywords — DR 30+"
      columns={COLUMNS}
      available_row_count={5}
      on_import={on_import}
      {...props}
    />
  );
  return { on_import, on_close, ...utils };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("IntakeImportDialog", () => {
  it("renders nothing when closed", () => {
    renderDialog({ is_open: false });
    expect(screen.queryByText("Import Keywords — DR 30+")).not.toBeInTheDocument();
  });

  it("renders the title, dropzone and expected columns when open", () => {
    renderDialog();
    expect(screen.getByText("Import Keywords — DR 30+")).toBeInTheDocument();
    expect(screen.getByText(/drag & drop your spreadsheet here/i)).toBeInTheDocument();
    const columns_hint = screen.getByText("Expected columns").parentElement as HTMLElement;
    expect(within(columns_hint).getByText("Keyword")).toBeInTheDocument();
    expect(within(columns_hint).getByText("Landing Page")).toBeInTheDocument();
    expect(within(columns_hint).getByText("Exact Match")).toBeInTheDocument();
  });

  it("disables the Import button until a file is ready", () => {
    renderDialog();
    expect(screen.getByRole("button", { name: /^Import/i })).toBeDisabled();
  });

  it("parses a dropped CSV, previews it and imports the data rows on confirm", async () => {
    const { container, on_import, on_close } = renderDialog({ available_row_count: 5 });

    dropFiles(
      getDropzone(container),
      [makeCsvFile("Keyword,Landing Page,Exact Match\nseo tips,https://a.com,yes\nlink building,https://b.com,no")]
    );

    // Preview renders the two data rows (header stripped).
    expect(await screen.findByText("seo tips")).toBeInTheDocument();
    expect(screen.getByText("link building")).toBeInTheDocument();
    expect(screen.getByText(/2 rows found/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /^Import 2 rows/i }));

    expect(on_import).toHaveBeenCalledTimes(1);
    expect(on_import).toHaveBeenCalledWith([
      ["seo tips", "https://a.com", "yes"],
      ["link building", "https://b.com", "no"],
    ]);
    expect(on_close).toHaveBeenCalledTimes(1);
  });

  it("parses a file uploaded through the hidden file input (browse)", async () => {
    const { container, on_import } = renderDialog();
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.upload(
      input,
      makeCsvFile("Keyword,Landing Page\nseo tips,https://a.com")
    );

    expect(await screen.findByText("seo tips")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /^Import 1 row/i }));
    expect(on_import).toHaveBeenCalledWith([["seo tips", "https://a.com"]]);
  });

  it("parses an .xlsx file and strips the header + index column", async () => {
    const { container, on_import } = renderDialog();

    dropFiles(getDropzone(container), [
      makeXlsxFile([
        ["#", "Keyword", "Landing Page"],
        [1, "seo tips", "https://a.com"],
        [2, "link building", "https://b.com"],
      ]),
    ]);

    expect(await screen.findByText("seo tips")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /^Import 2 rows/i }));
    expect(on_import).toHaveBeenCalledWith([
      ["seo tips", "https://a.com"],
      ["link building", "https://b.com"],
    ]);
  });

  it("warns and caps the preview when the file has more rows than were purchased", async () => {
    const rows = Array.from({ length: 5 }, (_, i) => `kw${i + 1},https://p${i + 1}.com`).join("\n");
    const { container, on_import } = renderDialog({ available_row_count: 2 });

    dropFiles(getDropzone(container), [makeCsvFile(`Keyword,Landing Page\n${rows}`)]);

    expect(await screen.findByText(/5 rows found/i)).toBeInTheDocument();
    // Overflow warning: only 2 kept, 3 ignored.
    expect(screen.getByText(/remaining/i)).toHaveTextContent(/3 rows.*will be ignored/i);
    // Preview shows only the first 2 rows.
    expect(screen.getByText("kw1")).toBeInTheDocument();
    expect(screen.getByText("kw2")).toBeInTheDocument();
    expect(screen.queryByText("kw3")).not.toBeInTheDocument();
    // Button announces the capped count.
    expect(screen.getByRole("button", { name: /^Import 2 rows/i })).toBeInTheDocument();

    // The full grid is still handed off — the table applies the cap + banner.
    await userEvent.click(screen.getByRole("button", { name: /^Import 2 rows/i }));
    expect((on_import.mock.calls[0][0] as string[][]).length).toBe(5);
  });

  it("shows an error for an unsupported file type", async () => {
    const { container, on_import } = renderDialog();

    dropFiles(getDropzone(container), [
      new File(["\x89PNG"], "logo.png", { type: "image/png" }),
    ]);

    expect(await screen.findByText(/unsupported file type/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Import/i })).toBeDisabled();
    expect(on_import).not.toHaveBeenCalled();
  });

  it("shows an error when the file has a header but no data rows", async () => {
    const { container } = renderDialog();

    dropFiles(getDropzone(container), [makeCsvFile("Keyword,Landing Page")]);

    expect(await screen.findByText(/couldn't find any data rows/i)).toBeInTheDocument();
  });

  it("lets the user remove a selected file and return to the dropzone", async () => {
    const { container } = renderDialog();

    dropFiles(getDropzone(container), [makeCsvFile("Keyword,Landing Page\nseo tips,https://a.com")]);
    expect(await screen.findByText("seo tips")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /remove file/i }));

    expect(screen.queryByText("seo tips")).not.toBeInTheDocument();
    expect(screen.getByText(/drag & drop your spreadsheet here/i)).toBeInTheDocument();
  });

  it("closes without importing when Cancel is clicked", async () => {
    const { on_import, on_close } = renderDialog();

    await userEvent.click(screen.getByRole("button", { name: /^Cancel$/ }));

    expect(on_close).toHaveBeenCalledTimes(1);
    expect(on_import).not.toHaveBeenCalled();
  });
});
