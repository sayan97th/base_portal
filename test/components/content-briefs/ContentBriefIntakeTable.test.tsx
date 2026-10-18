/**
 * Tests for the Content Brief intake table — structurally identical to
 * ContentOptimizationIntakeTable (same row shape, same paste/import engine),
 * but scoped to "Current Live URL" wording and its own tier labels/CSV
 * headers. See ContentOptimizationIntakeTable.test.tsx for the parallel
 * cases and pasted-grid.test.ts for the underlying engine's own coverage.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContentBriefIntakeTable from "@/components/content-briefs/ContentBriefIntakeTable";
import type { ContentOptimizationIntakeRow } from "@/types/client/unified-cart";
import { downloadCsv } from "@/lib/exportCsv";

jest.mock("@/lib/exportCsv", () => ({ downloadCsv: jest.fn() }));
const mockDownloadCsv = downloadCsv as jest.MockedFunction<typeof downloadCsv>;

function makeRows(count: number): ContentOptimizationIntakeRow[] {
  return Array.from({ length: count }, () => ({
    primary_keyword: "",
    secondary_keywords: "",
    content_page_url: "",
    notes: "",
  }));
}

function makeCsvFile(text: string, name = "briefs.csv"): File {
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

function pasteInto(input: HTMLElement, text: string): void {
  fireEvent.paste(input, { clipboardData: { getData: () => text } });
}

function renderTable(
  rows: ContentOptimizationIntakeRow[],
  props: Partial<React.ComponentProps<typeof ContentBriefIntakeTable>> = {}
) {
  const onChange = jest.fn();
  render(<ContentBriefIntakeTable tier_name="Content Brief" rows={rows} onChange={onChange} {...props} />);
  return { onChange };
}

beforeEach(() => jest.clearAllMocks());

describe("ContentBriefIntakeTable — manual editing", () => {
  it("renders one row of inputs per row, labeled for a live URL", () => {
    renderTable(makeRows(2));
    expect(screen.getAllByPlaceholderText("e.g. seo content strategy")).toHaveLength(2);
    expect(screen.getByText("Current Live URL")).toBeInTheDocument();
  });

  it("refuses to delete the last remaining row", async () => {
    const { onChange } = renderTable(makeRows(1));
    await userEvent.click(screen.getByTitle("Delete row"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("triggers a CSV download with Current Live URL in the header row", async () => {
    renderTable(makeRows(1));
    await userEvent.click(screen.getByRole("button", { name: /Export CSV/i }));

    expect(mockDownloadCsv).toHaveBeenCalledWith(
      "Content_Brief_intake.csv",
      ["#", "Primary Keyword", "Secondary Keywords", "Current Live URL", "Notes"],
      [["1", "", "", "", ""]]
    );
  });
});

describe("ContentBriefIntakeTable — cell paste", () => {
  it("caps a bulk paste to the rows purchased and reports the overflow", () => {
    const { onChange } = renderTable(makeRows(2));
    const [first_keyword_input] = screen.getAllByPlaceholderText("e.g. seo content strategy");

    pasteInto(
      first_keyword_input,
      "kw1\tsec1\thttps://p1.com\nkw2\tsec2\thttps://p2.com\nkw3\tsec3\thttps://p3.com"
    );

    const applied = onChange.mock.calls[0][0] as ContentOptimizationIntakeRow[];
    expect(applied).toHaveLength(2);
    expect(applied.map((r) => r.primary_keyword)).toEqual(["kw1", "kw2"]);
    expect(screen.getByText(/were ignored because this table/i)).toHaveTextContent(/remaining 1 row/i);
  });
});

describe("ContentBriefIntakeTable — spreadsheet import", () => {
  it("fills every row from an imported file via the Import Pages dialog", async () => {
    const { onChange } = renderTable(makeRows(1));

    await userEvent.click(screen.getByRole("button", { name: /^Import$/ }));
    expect(screen.getByText("Import Pages — Content Brief")).toBeInTheDocument();

    dropFiles(getDropzone(), [
      makeCsvFile("Primary Keyword,Secondary Keywords,Current Live URL\nwidgets,,https://a.com/widgets"),
    ]);
    await userEvent.click(await screen.findByRole("button", { name: /^Import 1 row/i }));

    expect(onChange).toHaveBeenCalledWith([
      { primary_keyword: "widgets", secondary_keywords: "", content_page_url: "https://a.com/widgets", notes: "" },
    ]);
  });
});
