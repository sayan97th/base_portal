/**
 * Tests for the Content Optimization intake table. Same paste/import engine
 * as the other three intake tables (see IntakeFormTable.test.tsx and
 * LinkBuildingIntakeTable.test.tsx) — this file focuses on what's unique
 * here: three plain-text columns (no select to fuzzy-match), the delete
 * button's "keep at least one row" guard, and CSV export.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContentOptimizationIntakeTable from "@/components/content-optimizations/ContentOptimizationIntakeTable";
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

function makeCsvFile(text: string, name = "pages.csv"): File {
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
  props: Partial<React.ComponentProps<typeof ContentOptimizationIntakeTable>> = {}
) {
  const onChange = jest.fn();
  render(
    <ContentOptimizationIntakeTable tier_name="800-1,599 Words" rows={rows} onChange={onChange} {...props} />
  );
  return { onChange };
}

beforeEach(() => jest.clearAllMocks());

describe("ContentOptimizationIntakeTable — manual editing", () => {
  it("renders one row of inputs per row", () => {
    renderTable(makeRows(3));
    expect(screen.getAllByPlaceholderText("e.g. seo content optimization")).toHaveLength(3);
  });

  it("refuses to delete the last remaining row", async () => {
    const { onChange } = renderTable(makeRows(1));

    await userEvent.click(screen.getByTitle("Delete row"));

    expect(onChange).not.toHaveBeenCalled();
  });

  it("deletes a row when more than one remains", async () => {
    const { onChange } = renderTable(makeRows(2));

    await userEvent.click(screen.getAllByTitle("Delete row")[0]);

    expect(onChange).toHaveBeenCalledWith([
      { primary_keyword: "", secondary_keywords: "", content_page_url: "", notes: "" },
    ]);
  });

  it("triggers a CSV download with the tier name in the filename", async () => {
    const rows = makeRows(1);
    rows[0] = { primary_keyword: "kw", secondary_keywords: "", content_page_url: "https://a.com", notes: "" };
    renderTable(rows);

    await userEvent.click(screen.getByRole("button", { name: /Export CSV/i }));

    expect(mockDownloadCsv).toHaveBeenCalledWith(
      "800-1,599_Words_intake.csv",
      ["#", "Primary Keyword", "Secondary Keywords", "Content Page URL", "Notes"],
      [["1", "kw", "", "https://a.com", ""]]
    );
  });
});

describe("ContentOptimizationIntakeTable — cell paste", () => {
  it("does not intercept a plain single-cell paste (native browser paste applies)", () => {
    const { onChange } = renderTable(makeRows(2));
    const [, second_url_input] = screen.getAllByPlaceholderText("https://example.com/page");

    pasteInto(second_url_input, "https://b.com");

    expect(onChange).not.toHaveBeenCalled();
  });

  it("pastes starting mid-row when the paste begins in a later column", () => {
    const { onChange } = renderTable(makeRows(1));
    const [secondary_input] = screen.getAllByPlaceholderText("e.g. content marketing, on-page seo");

    // Two columns pasted starting at "Secondary Keywords" — primary_keyword is untouched.
    pasteInto(secondary_input, "secondary a\thttps://a.com");

    expect(onChange).toHaveBeenCalledWith([
      { primary_keyword: "", secondary_keywords: "secondary a", content_page_url: "https://a.com", notes: "" },
    ]);
  });

  it("caps a bulk paste to the rows purchased and reports the overflow", () => {
    const { onChange } = renderTable(makeRows(3));
    const [first_keyword_input] = screen.getAllByPlaceholderText("e.g. seo content optimization");

    pasteInto(
      first_keyword_input,
      "kw1\tsec1\thttps://p1.com\nkw2\tsec2\thttps://p2.com\nkw3\tsec3\thttps://p3.com\nkw4\tsec4\thttps://p4.com"
    );

    const applied = onChange.mock.calls[0][0] as ContentOptimizationIntakeRow[];
    expect(applied).toHaveLength(3);
    expect(applied.map((r) => r.primary_keyword)).toEqual(["kw1", "kw2", "kw3"]);
    expect(screen.getByText(/were ignored because this table/i)).toHaveTextContent(/remaining 1 row/i);
  });
});

describe("ContentOptimizationIntakeTable — spreadsheet import", () => {
  it("fills every row from an imported file via the Import Pages dialog", async () => {
    const { onChange } = renderTable(makeRows(2));

    await userEvent.click(screen.getByRole("button", { name: /^Import$/ }));
    expect(screen.getByText("Import Pages — 800-1,599 Words")).toBeInTheDocument();

    dropFiles(getDropzone(), [
      makeCsvFile(
        "Primary Keyword,Secondary Keywords,Content Page URL\nseo tips,,https://a.com\nlink building,,https://b.com"
      ),
    ]);
    await userEvent.click(await screen.findByRole("button", { name: /^Import 2 rows/i }));

    expect(onChange).toHaveBeenCalledWith([
      { primary_keyword: "seo tips", secondary_keywords: "", content_page_url: "https://a.com", notes: "" },
      { primary_keyword: "link building", secondary_keywords: "", content_page_url: "https://b.com", notes: "" },
    ]);
  });
});
