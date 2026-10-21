/**
 * The keyboard shortcuts cheat sheet of the admin "Link Building Orders" table:
 * hidden until opened, labeled for the viewer's platform (⌘ on Mac, Ctrl elsewhere),
 * with the MacBook Fn key alternatives, and closed by Escape, its button or the backdrop.
 */

import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import KeyboardShortcutsDialog, {
  LINK_BUILDING_ORDER_SHORTCUT_GROUPS,
} from "@/components/admin/dashboard/KeyboardShortcutsDialog";

function renderDialog(props: Partial<React.ComponentProps<typeof KeyboardShortcutsDialog>> = {}) {
  const onClose = jest.fn();
  render(<KeyboardShortcutsDialog is_open is_mac onClose={onClose} {...props} />);
  return { onClose };
}

/** The <li> of a shortcut, by its description. */
function shortcutRow(description: string): HTMLElement {
  const row = screen.getByText(description).closest("li");
  if (!row) throw new Error(`No shortcut row for "${description}"`);
  return row as HTMLElement;
}

describe("KeyboardShortcutsDialog", () => {
  it("renders nothing while closed", () => {
    renderDialog({ is_open: false });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("is an accessible modal dialog named after its title", () => {
    renderDialog();

    const dialog = screen.getByRole("dialog", { name: "Keyboard shortcuts" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("lists every group and every shortcut", () => {
    renderDialog();

    LINK_BUILDING_ORDER_SHORTCUT_GROUPS.forEach((group) => {
      expect(screen.getByRole("heading", { name: group.title })).toBeInTheDocument();
    });
    const entry_count = LINK_BUILDING_ORDER_SHORTCUT_GROUPS.reduce((sum, group) => sum + group.entries.length, 0);
    expect(screen.getAllByRole("listitem")).toHaveLength(entry_count);
  });

  it("uses Mac symbols for Mac users", () => {
    renderDialog({ is_mac: true });

    expect(within(shortcutRow("Insert today's date")).getByText("⌘;")).toBeInTheDocument();
    expect(within(shortcutRow("Cut")).getByText("⌘X")).toBeInTheDocument();
    expect(within(shortcutRow("Fill down")).getByText("⌘D")).toBeInTheDocument();
    expect(within(shortcutRow("Select the column")).getByText("⌃Space")).toBeInTheDocument();
    const redo = within(shortcutRow("Redo"));
    expect(redo.getByText("⌘⇧Z")).toBeInTheDocument();
    expect(redo.getByText("⌘Y")).toBeInTheDocument();
    expect(redo.getByText("or")).toBeInTheDocument();
  });

  it("uses Ctrl labels for Windows and Linux users", () => {
    renderDialog({ is_mac: false });

    expect(within(shortcutRow("Insert today's date")).getByText("Ctrl+;")).toBeInTheDocument();
    expect(within(shortcutRow("Redo")).getByText("Ctrl+Shift+Z")).toBeInTheDocument();
    expect(screen.queryByText(/⌘/)).not.toBeInTheDocument();
  });

  it("shows the Fn key alternatives a MacBook keyboard needs for Home, End and Page keys", () => {
    renderDialog({ is_mac: true });

    const row_edges = within(shortcutRow("Start or end of the row"));
    expect(row_edges.getByText("Fn←")).toBeInTheDocument();
    expect(row_edges.getByText("Fn→")).toBeInTheDocument();
    expect(within(shortcutRow("Page up or down")).getByText("Fn↑")).toBeInTheDocument();
  });

  it("shows Home and End to PC users", () => {
    renderDialog({ is_mac: false });

    const row_edges = within(shortcutRow("Start or end of the row"));
    expect(row_edges.getByText("Home")).toBeInTheDocument();
    expect(row_edges.getByText("End")).toBeInTheDocument();
  });

  it("focuses its close button when it opens", () => {
    renderDialog();

    expect(screen.getByRole("button", { name: "Close keyboard shortcuts" })).toHaveFocus();
  });

  it("closes with Escape", () => {
    const { onClose } = renderDialog();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes with its close button", () => {
    const { onClose } = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Close keyboard shortcuts" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on a backdrop click but not on a click inside the dialog", () => {
    const { onClose } = renderDialog();
    const dialog = screen.getByRole("dialog");

    fireEvent.mouseDown(dialog);
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.mouseDown(dialog.parentElement as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("stops listening for Escape once closed", () => {
    const onClose = jest.fn();
    const { rerender } = render(<KeyboardShortcutsDialog is_open is_mac onClose={onClose} />);
    rerender(<KeyboardShortcutsDialog is_open={false} is_mac onClose={onClose} />);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).not.toHaveBeenCalled();
  });
});
