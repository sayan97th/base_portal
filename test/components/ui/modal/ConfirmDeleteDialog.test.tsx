import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConfirmDeleteDialog, {
  type ConfirmDeleteDialogProps,
} from "@/components/ui/modal/ConfirmDeleteDialog";

function renderDialog(overrides: Partial<ConfirmDeleteDialogProps> = {}) {
  const on_confirm = jest.fn();
  const on_close = jest.fn();

  const utils = render(
    <ConfirmDeleteDialog
      is_open
      title="Delete coupon"
      description="Clients will no longer be able to redeem this code."
      item_label="Coupon code"
      item_name="SUMMER25"
      onConfirm={on_confirm}
      onClose={on_close}
      {...overrides}
    />
  );

  return { ...utils, on_confirm, on_close };
}

describe("ConfirmDeleteDialog", () => {
  it("renders nothing when closed", () => {
    renderDialog({ is_open: false });
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("renders an accessible alert dialog with the record preview", () => {
    renderDialog({ consequences: ["This coupon is currently active."] });

    const dialog = screen.getByRole("alertdialog", { name: "Delete coupon" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("SUMMER25")).toBeInTheDocument();
    expect(screen.getByText("Coupon code")).toBeInTheDocument();
    expect(screen.getByText("This coupon is currently active.")).toBeInTheDocument();
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
  });

  it("focuses the cancel button first, as the safe default", () => {
    renderDialog();
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
  });

  it("calls onConfirm when the delete button is clicked", async () => {
    const { on_confirm } = renderDialog({ confirm_label: "Delete coupon" });
    await userEvent.click(screen.getByRole("button", { name: "Delete coupon" }));
    expect(on_confirm).toHaveBeenCalledTimes(1);
  });

  it("closes with the cancel button, the close icon and the Escape key", async () => {
    const { on_close } = renderDialog();

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await userEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    await userEvent.keyboard("{Escape}");

    expect(on_close).toHaveBeenCalledTimes(3);
  });

  it("locks every action while the deletion is in progress", async () => {
    const { on_close, on_confirm } = renderDialog({ is_loading: true });

    expect(screen.getByRole("button", { name: /Deleting/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(screen.getByRole("alertdialog")).toHaveAttribute("aria-busy", "true");

    await userEvent.keyboard("{Escape}");
    expect(on_close).not.toHaveBeenCalled();
    expect(on_confirm).not.toHaveBeenCalled();
  });

  it("requires the exact confirmation text before enabling the delete button", async () => {
    const { on_confirm } = renderDialog({
      confirmation_text: "Marketing",
      confirm_label: "Delete team",
    });

    const delete_button = screen.getByRole("button", { name: "Delete team" });
    const input = screen.getByLabelText(/to confirm/i);

    expect(input).toHaveFocus();
    expect(delete_button).toBeDisabled();

    await userEvent.type(input, "Market");
    expect(delete_button).toBeDisabled();

    await userEvent.type(input, "ing{Enter}");
    expect(delete_button).toBeEnabled();
    expect(on_confirm).toHaveBeenCalledTimes(1);
  });

  it("uses remove wording for the remove variant", () => {
    renderDialog({ variant: "remove", title: "Remove member" });
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
    expect(screen.queryByText(/cannot be undone/i)).not.toBeInTheDocument();
  });

  it("renders into document.body through a portal", () => {
    const { container } = renderDialog();
    expect(container).toBeEmptyDOMElement();
    expect(document.body).toContainElement(screen.getByRole("alertdialog"));
  });

  it("closes when the backdrop is clicked", async () => {
    const { on_close } = renderDialog();
    const backdrop = screen.getByRole("alertdialog").previousElementSibling as HTMLElement;

    await userEvent.click(backdrop);

    expect(on_close).toHaveBeenCalledTimes(1);
  });

  it("ignores backdrop clicks while deleting", async () => {
    const { on_close } = renderDialog({ is_loading: true });
    const backdrop = screen.getByRole("alertdialog").previousElementSibling as HTMLElement;

    await userEvent.click(backdrop);

    expect(on_close).not.toHaveBeenCalled();
  });

  it("keeps keyboard focus inside the dialog", async () => {
    renderDialog({ confirm_label: "Delete coupon" });

    const close_button = screen.getByRole("button", { name: "Close dialog" });
    const cancel_button = screen.getByRole("button", { name: "Cancel" });
    const delete_button = screen.getByRole("button", { name: "Delete coupon" });

    expect(cancel_button).toHaveFocus();
    await userEvent.tab();
    expect(delete_button).toHaveFocus();
    await userEvent.tab();
    expect(close_button).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(delete_button).toHaveFocus();
  });

  it("locks page scroll while open and restores it on close", () => {
    document.body.style.overflow = "auto";
    const { unmount } = renderDialog();

    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("auto");
  });

  it("hides the preview card when no item name is given", () => {
    renderDialog({ item_name: undefined, item_label: "Coupon code" });
    expect(screen.queryByText("Coupon code")).not.toBeInTheDocument();
  });

  it("shows the item meta line", () => {
    renderDialog({ item_meta: "Summer Sale · 12 redemptions" });
    expect(screen.getByText("Summer Sale · 12 redemptions")).toBeInTheDocument();
  });

  it("shows a custom loading label", () => {
    renderDialog({ is_loading: true, loading_label: "Removing coupon..." });
    expect(screen.getByRole("button", { name: "Removing coupon..." })).toBeDisabled();
  });

  it("restores focus to the trigger after closing", async () => {
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    trigger.focus();

    const { rerender } = renderDialog();
    expect(trigger).not.toHaveFocus();

    rerender(
      <ConfirmDeleteDialog is_open={false} title="Delete coupon" onConfirm={jest.fn()} onClose={jest.fn()} />
    );
    expect(trigger).toHaveFocus();
    trigger.remove();
  });
});
