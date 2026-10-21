/**
 * The dialog that adds or edits a formula column: validation, the live preview,
 * inserting column references, the format, saving and deleting.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import FormulaColumnDialog, {
  type FormulaColumnDraft,
  type FormulaPreviewRow,
} from "@/components/admin/dashboard/FormulaColumnDialog";

type DialogProps = React.ComponentProps<typeof FormulaColumnDialog>;

const EMPTY_DRAFT: FormulaColumnDraft = { name: "", formula: "", format: "auto" };

const PREVIEW: FormulaPreviewRow[] = [
  { row_number: 1, label: "BL-1 · Acme", text: "$172.50", is_error: false },
  { row_number: 2, label: "BL-2 · Globex", text: "", is_error: false },
  { row_number: 3, label: "BL-3 · Umbrella", text: "#N/A", is_error: true, title: "Did not find value" },
];

function renderDialog(overrides: Partial<DialogProps> = {}) {
  const props: DialogProps = {
    mode: "create",
    initial: EMPTY_DRAFT,
    first_row_number: 1,
    reference_columns: [
      { letter: "D", label: "Link Type" },
      { letter: "S", label: "DR" },
      { letter: "X", label: "Current Price" },
    ],
    getPreview: jest.fn(() => PREVIEW),
    onSubmit: jest.fn(() => Promise.resolve()),
    onClose: jest.fn(),
    ...overrides,
  };
  render(<FormulaColumnDialog {...props} />);
  return props;
}

const nameInput = () => screen.getByLabelText("Column name") as HTMLInputElement;
const formulaInput = () => document.getElementById("formula-column-formula") as HTMLInputElement;

function typeFormula(text: string): void {
  fireEvent.change(formulaInput(), { target: { value: text } });
}

describe("FormulaColumnDialog", () => {
  it("opens on the name when adding a column and on the formula when editing one", () => {
    renderDialog();
    expect(screen.getByRole("dialog")).toHaveTextContent("Add formula column");
    expect(nameInput()).toHaveFocus();
    expect(formulaInput()).toHaveValue("=");
  });

  it("opens an existing column on its formula", () => {
    renderDialog({
      mode: "edit",
      initial: { name: "Margin", formula: "=AA1-X1", format: "currency" },
    });
    expect(screen.getByRole("dialog")).toHaveTextContent("Edit formula column");
    expect(formulaInput()).toHaveFocus();
    expect(formulaInput()).toHaveValue("=AA1-X1");
    expect(screen.getByLabelText("Format")).toHaveValue("currency");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
  });

  it("shows no error for the equals sign it opens with", () => {
    renderDialog();
    expect(screen.queryByText(/A formula starts with/)).not.toBeInTheDocument();
    expect(screen.getByText(/Use the letters of the column header/)).toBeInTheDocument();
  });

  it("asks for a name and a formula before saving", () => {
    const props = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Add column" }));
    expect(screen.getByText("Give the column a name.")).toBeInTheDocument();
    expect(screen.getByText("Write the formula of the column.")).toBeInTheDocument();
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it("explains a syntax error while typing", () => {
    renderDialog();
    typeFormula("=VLOOKUP(D1, D:AA, 24, FALSE");
    expect(screen.getByText('Missing ")".')).toBeInTheDocument();
    typeFormula("VLOOKUP(D1, D:AA, 24, FALSE)");
    expect(screen.getByText('A formula starts with "=", for example =S5*2.')).toBeInTheDocument();
  });

  it("does not save a formula with a syntax error", () => {
    const props = renderDialog();
    fireEvent.change(nameInput(), { target: { value: "Price" } });
    typeFormula("=SUM(");
    fireEvent.click(screen.getByRole("button", { name: "Add column" }));
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it("previews a valid formula on the first rows", () => {
    const props = renderDialog();
    typeFormula('=IFERROR(VLOOKUP(D1, D:AA, 24, FALSE), "")');

    expect(props.getPreview).toHaveBeenLastCalledWith('=IFERROR(VLOOKUP(D1, D:AA, 24, FALSE), "")', "auto");
    expect(screen.getByText("Preview on this page")).toBeInTheDocument();
    expect(screen.getByText("$172.50")).toBeInTheDocument();
    expect(screen.getByText("(empty)")).toBeInTheDocument();
    expect(screen.getByTitle("Did not find value")).toHaveTextContent("#N/A");
  });

  it("does not preview an empty or invalid formula", () => {
    const props = renderDialog();
    typeFormula("=SUM(");
    expect(props.getPreview).not.toHaveBeenCalled();
    expect(screen.queryByText("Preview on this page")).not.toBeInTheDocument();
  });

  it("previews again in the chosen format", () => {
    const props = renderDialog();
    typeFormula("=X1*1.15");
    fireEvent.change(screen.getByLabelText("Format"), { target: { value: "currency" } });
    expect(props.getPreview).toHaveBeenLastCalledWith("=X1*1.15", "currency");
  });

  it("inserts a column reference for the first row at the caret", () => {
    renderDialog({ first_row_number: 51 });
    typeFormula("=VLOOKUP(, D:AA, 24, FALSE)");
    formulaInput().setSelectionRange(9, 9);

    fireEvent.change(screen.getByLabelText("Insert a column reference"), { target: { value: "D" } });
    expect(formulaInput()).toHaveValue("=VLOOKUP(D51, D:AA, 24, FALSE)");
  });

  it("adds the equals sign when a reference is inserted into a formula without one", () => {
    renderDialog();
    typeFormula("");
    fireEvent.change(screen.getByLabelText("Insert a column reference"), { target: { value: "S" } });
    expect(formulaInput()).toHaveValue("=S1");
  });

  it("saves the trimmed name, formula and format", async () => {
    let resolveSubmit: () => void = () => {};
    const props = renderDialog({
      onSubmit: jest.fn(() => new Promise<void>((resolve) => (resolveSubmit = resolve))),
    });
    fireEvent.change(nameInput(), { target: { value: "  Partner price  " } });
    typeFormula(' =IFERROR(VLOOKUP(N1, N:X, 11, FALSE), "") ');
    fireEvent.change(screen.getByLabelText("Format"), { target: { value: "currency" } });
    fireEvent.click(screen.getByRole("button", { name: "Add column" }));

    expect(props.onSubmit).toHaveBeenCalledWith({
      name: "Partner price",
      formula: '=IFERROR(VLOOKUP(N1, N:X, 11, FALSE), "")',
      format: "currency",
    });
    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
    resolveSubmit();
  });

  it("shows why saving failed and lets the user retry", async () => {
    renderDialog({ onSubmit: jest.fn(() => Promise.reject({ message: "The table can have up to 30 formula columns." })) });
    fireEvent.change(nameInput(), { target: { value: "Price" } });
    typeFormula("=X1");
    fireEvent.click(screen.getByRole("button", { name: "Add column" }));

    expect(await screen.findByText("The table can have up to 30 formula columns.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add column" })).toBeEnabled();
  });

  it("shows a generic message for an error without one", async () => {
    renderDialog({ onSubmit: jest.fn(() => Promise.reject("network down")) });
    fireEvent.change(nameInput(), { target: { value: "Price" } });
    typeFormula("=X1");
    fireEvent.click(screen.getByRole("button", { name: "Add column" }));
    expect(await screen.findByText("The formula column could not be saved. Please try again.")).toBeInTheDocument();
  });

  it("asks for a second click before deleting", async () => {
    const onDelete = jest.fn(() => Promise.resolve());
    renderDialog({ mode: "edit", initial: { name: "Margin", formula: "=AA1-X1", format: "auto" }, onDelete });

    fireEvent.click(screen.getByRole("button", { name: "Delete column" }));
    expect(onDelete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Click again to delete" }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("explains a failed delete", async () => {
    const onDelete = jest.fn(() => Promise.reject(new Error("500")));
    renderDialog({ mode: "edit", initial: { name: "Margin", formula: "=AA1-X1", format: "auto" }, onDelete });
    fireEvent.click(screen.getByRole("button", { name: "Delete column" }));
    fireEvent.click(screen.getByRole("button", { name: "Click again to delete" }));
    expect(await screen.findByText("The formula column could not be deleted. Please try again.")).toBeInTheDocument();
  });

  it("hides the delete button when adding a column", () => {
    renderDialog();
    expect(screen.queryByRole("button", { name: "Delete column" })).not.toBeInTheDocument();
  });

  it("closes with Escape, the close button, Cancel and the backdrop", () => {
    const props = renderDialog();
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("dialog").firstElementChild as HTMLElement);
    expect(props.onClose).toHaveBeenCalledTimes(4);
  });

  it("lets the formula helper keep Escape while it suggests a function", () => {
    const props = renderDialog();
    fireEvent.focus(formulaInput());
    typeFormula("=VLO");
    formulaInput().setSelectionRange(4, 4);
    fireEvent.select(formulaInput());

    fireEvent.keyDown(formulaInput(), { key: "Escape" });
    expect(props.onClose).not.toHaveBeenCalled();
  });
});
