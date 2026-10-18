/**
 * Tests for the New Content intake table — covers manual editing, the
 * shared-across-rows Notes field, row deletion, cell-level clipboard paste
 * (including the Type of Content fuzzy match and the quantity-cap overflow
 * banner), and the spreadsheet Import dialog. Both paste and import funnel
 * through the same `applyPastedGridToRows` engine exercised directly in
 * `pasted-grid.test.ts` — these tests lock in that IntakeFormTable wires it
 * up correctly (column order, notes staying out of the mapped fields, and
 * the type-of-content select falling back to its current value when a
 * pasted cell doesn't match one of the fixed options).
 */

import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import IntakeFormTable from "@/components/new-content/IntakeFormTable";
import type { CartIntakeRow } from "@/types/client/unified-cart";

function makeRows(count: number): CartIntakeRow[] {
  return Array.from({ length: count }, () => ({
    keyword_phrase: "",
    secondary_keywords: "",
    type_of_content: "",
    notes: "",
  }));
}

function makeCsvFile(text: string, name = "content.csv"): File {
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

function renderTable(rows: CartIntakeRow[], props: Partial<React.ComponentProps<typeof IntakeFormTable>> = {}) {
  const onChange = jest.fn();
  const utils = render(
    <IntakeFormTable
      tier_name="Basic Article"
      form_index={1}
      total_forms={1}
      rows={rows}
      onChange={onChange}
      {...props}
    />
  );
  return { onChange, ...utils };
}

describe("IntakeFormTable — manual editing", () => {
  it("renders one row of inputs per row and the shared notes field", () => {
    renderTable(makeRows(3));

    expect(screen.getAllByPlaceholderText("e.g. seo content strategy")).toHaveLength(3);
    expect(screen.getByText("Basic Article")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/tone of voice, topic ideas/i)).toBeInTheDocument();
  });

  it("forwards a single-field edit without touching other rows", async () => {
    const { onChange } = renderTable(makeRows(2));

    const [first_keyword_input] = screen.getAllByPlaceholderText("e.g. seo content strategy");
    await userEvent.type(first_keyword_input, "a");

    expect(onChange).toHaveBeenCalledWith([
      { keyword_phrase: "a", secondary_keywords: "", type_of_content: "", notes: "" },
      { keyword_phrase: "", secondary_keywords: "", type_of_content: "", notes: "" },
    ]);
  });

  it("applies a notes edit to every row (notes is shared, not per-row)", () => {
    const { onChange } = renderTable(makeRows(2));

    fireEvent.change(screen.getByPlaceholderText(/tone of voice, topic ideas/i), {
      target: { value: "please keep it casual" },
    });

    const applied = onChange.mock.calls[0][0] as CartIntakeRow[];
    expect(applied.every((row) => row.notes === "please keep it casual")).toBe(true);
  });

  it("deletes a row via the delete button", async () => {
    const { onChange } = renderTable(makeRows(2));

    await userEvent.click(screen.getAllByTitle("Delete row")[0]);

    expect(onChange).toHaveBeenCalledWith([
      { keyword_phrase: "", secondary_keywords: "", type_of_content: "", notes: "" },
    ]);
  });

  it("hides delete/import/export actions when hide_actions is set", () => {
    renderTable(makeRows(1), { hide_actions: true });

    expect(screen.queryByTitle("Delete row")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Import$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Export CSV/i })).not.toBeInTheDocument();
  });

  it("flags an empty Type of Content select with the error ring when show_errors is set", () => {
    renderTable(makeRows(1), { show_errors: true });

    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.className).toMatch(/ring-red-300/);
  });
});

describe("IntakeFormTable — cell paste", () => {
  it("fills keyword, secondary keywords, and matches Type of Content across two rows", () => {
    const { onChange } = renderTable(makeRows(2));
    const [first_keyword_input] = screen.getAllByPlaceholderText("e.g. seo content strategy");

    pasteInto(first_keyword_input, "seo tips\tsecondary a\tblog article\nlink building\tsecondary b\tProduct Page");

    expect(onChange).toHaveBeenCalledWith([
      { keyword_phrase: "seo tips", secondary_keywords: "secondary a", type_of_content: "Blog Article", notes: "" },
      { keyword_phrase: "link building", secondary_keywords: "secondary b", type_of_content: "Product Page", notes: "" },
    ]);
  });

  it("leaves an unrecognized Type of Content value untouched, keeping the current selection", () => {
    const rows = makeRows(1);
    rows[0].type_of_content = "Blog Article";
    const { onChange } = renderTable(rows);
    const [keyword_input] = screen.getAllByPlaceholderText("e.g. seo content strategy");

    pasteInto(keyword_input, "seo tips\tsecondary\tNot A Real Type");

    const applied = onChange.mock.calls[0][0] as CartIntakeRow[];
    expect(applied[0].type_of_content).toBe("Blog Article");
  });

  it("does not intercept a plain single-cell paste (native browser paste applies)", () => {
    const { onChange } = renderTable(makeRows(1));
    const [keyword_input] = screen.getAllByPlaceholderText("e.g. seo content strategy");

    pasteInto(keyword_input, "just one keyword");

    expect(onChange).not.toHaveBeenCalled();
  });

  it("caps a paste to the available rows and reports the rest as overflow", () => {
    const { onChange } = renderTable(makeRows(2));
    const [first_keyword_input] = screen.getAllByPlaceholderText("e.g. seo content strategy");

    pasteInto(first_keyword_input, "kw1\nkw2\nkw3\nkw4\nkw5");

    const applied = onChange.mock.calls[0][0] as CartIntakeRow[];
    expect(applied).toHaveLength(2);
    expect(applied.map((r) => r.keyword_phrase)).toEqual(["kw1", "kw2"]);

    expect(screen.getByText(/were ignored because this table/i)).toHaveTextContent(/remaining 3 rows/i);
  });
});

describe("IntakeFormTable — spreadsheet import", () => {
  it("imports rows starting from the top regardless of table contents", async () => {
    const rows = makeRows(2);
    rows[0].keyword_phrase = "existing keyword";
    const { onChange } = renderTable(rows);

    await userEvent.click(screen.getByRole("button", { name: /^Import$/ }));
    dropFiles(getDropzone(), [
      makeCsvFile(
        "Primary Keyword,Secondary Keywords,Type of Content\nseo tips,secondary a,Blog Article\nlink building,secondary b,Home Page"
      ),
    ]);

    await userEvent.click(await screen.findByRole("button", { name: /^Import 2 rows/i }));

    expect(onChange).toHaveBeenCalledWith([
      { keyword_phrase: "seo tips", secondary_keywords: "secondary a", type_of_content: "Blog Article", notes: "" },
      { keyword_phrase: "link building", secondary_keywords: "secondary b", type_of_content: "Home Page", notes: "" },
    ]);
  });

  it("shows the dialog title scoped to this tier", async () => {
    renderTable(makeRows(1));

    await userEvent.click(screen.getByRole("button", { name: /^Import$/ }));

    expect(within(screen.getByRole("dialog")).getByText("Import Content Rows — Basic Article")).toBeInTheDocument();
  });
});
