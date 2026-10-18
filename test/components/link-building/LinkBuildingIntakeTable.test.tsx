/**
 * Integration test for the Link Building intake table's spreadsheet import.
 *
 * Verifies the end-to-end wiring the client asked for: the "Import" action
 * opens the dialog, an uploaded file fills the table rows, and rows beyond the
 * quantity purchased are dropped and surfaced via the overflow banner (rather
 * than growing the table). The other three intake tables share the exact same
 * IntakeImportDialog + applyPastedGridToRows pipeline exercised here.
 */

import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LinkBuildingIntakeTable, {
  type KeywordRow,
} from "@/components/link-building/LinkBuildingIntakeTable";

function makeRows(count: number): KeywordRow[] {
  return Array.from({ length: count }, () => ({
    keyword: "",
    landing_page: "",
    exact_match: false,
  }));
}

function makeCsvFile(text: string, name = "keywords.csv"): File {
  return new File([text], name, { type: "text/csv" });
}

function dropFiles(zone: HTMLElement, files: File[]): void {
  fireEvent.drop(zone, {
    dataTransfer: {
      files,
      items: files.map((file) => ({ kind: "file", type: file.type, getAsFile: () => file })),
      types: ["Files"],
    },
  });
}

function getDropzone(): HTMLElement {
  const dialog = screen.getByRole("dialog");
  const input = dialog.querySelector('input[type="file"]');
  if (!input || !input.parentElement) throw new Error("dropzone input not found");
  return input.parentElement;
}

function renderTable(rows: KeywordRow[]) {
  const onRowsPaste = jest.fn();
  const onRowChange = jest.fn();
  render(
    <LinkBuildingIntakeTable
      tier_name="DR 30+"
      rows={rows}
      onRowChange={onRowChange}
      onRowsPaste={onRowsPaste}
    />
  );
  return { onRowsPaste, onRowChange };
}

describe("LinkBuildingIntakeTable — import", () => {
  it("opens the import dialog from the Import action", async () => {
    renderTable(makeRows(2));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /^Import$/ }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Import Keywords — DR 30+")).toBeInTheDocument();
  });

  it("fills the table rows from an imported file", async () => {
    const { onRowsPaste } = renderTable(makeRows(2));

    await userEvent.click(screen.getByRole("button", { name: /^Import$/ }));
    dropFiles(getDropzone(), [
      makeCsvFile("Keyword,Landing Page\nseo tips,https://a.com\nlink building,https://b.com"),
    ]);

    await userEvent.click(await screen.findByRole("button", { name: /^Import 2 rows/i }));

    expect(onRowsPaste).toHaveBeenCalledTimes(1);
    expect(onRowsPaste).toHaveBeenCalledWith([
      { keyword: "seo tips", landing_page: "https://a.com", exact_match: false },
      { keyword: "link building", landing_page: "https://b.com", exact_match: false },
    ]);
  });

  it("parses the Exact Match column into a boolean", async () => {
    const { onRowsPaste } = renderTable(makeRows(1));

    await userEvent.click(screen.getByRole("button", { name: /^Import$/ }));
    dropFiles(getDropzone(), [
      makeCsvFile("Keyword,Landing Page,Exact Match\nseo tips,https://a.com,yes"),
    ]);

    await userEvent.click(await screen.findByRole("button", { name: /^Import 1 row/i }));

    expect(onRowsPaste).toHaveBeenCalledWith([
      { keyword: "seo tips", landing_page: "https://a.com", exact_match: true },
    ]);
  });

  it("caps imported rows to the quantity purchased and shows the overflow banner", async () => {
    const { onRowsPaste } = renderTable(makeRows(2));
    const csv_rows = Array.from({ length: 5 }, (_, i) => `kw${i + 1},https://p${i + 1}.com`).join("\n");

    await userEvent.click(screen.getByRole("button", { name: /^Import$/ }));
    dropFiles(getDropzone(), [makeCsvFile(`Keyword,Landing Page\n${csv_rows}`)]);

    await userEvent.click(await screen.findByRole("button", { name: /^Import 2 rows/i }));

    // Only the first two rows are applied — the table never grows past 2.
    const applied = onRowsPaste.mock.calls[0][0] as KeywordRow[];
    expect(applied).toHaveLength(2);
    expect(applied[0].keyword).toBe("kw1");
    expect(applied[1].keyword).toBe("kw2");

    // Overflow banner tells the client the remaining rows were ignored.
    const banner = screen.getByText(/were ignored because this table/i);
    expect(banner).toHaveTextContent(/remaining 3 rows/i);
  });
});
