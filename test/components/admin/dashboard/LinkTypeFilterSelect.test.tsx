import { fireEvent, render, screen, within } from "@testing-library/react";
import LinkTypeFilterSelect from "@/components/admin/dashboard/LinkTypeFilterSelect";

const OPTIONS = ["DR 30+ External", "DR 50+ External", "DR 30+ Internal"];

function renderSelect(value = "") {
  const onChange = jest.fn();
  render(<LinkTypeFilterSelect value={value} options={OPTIONS} onChange={onChange} />);
  return { onChange, trigger: screen.getByRole("button", { name: /^Filter by link type/ }) };
}

describe("LinkTypeFilterSelect", () => {
  it("shows every link type as the default value", () => {
    const { trigger } = renderSelect();

    expect(trigger).toHaveTextContent("All link types");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear link type filter" })).not.toBeInTheDocument();
  });

  it("groups the options by placement with a short label", () => {
    const { trigger } = renderSelect();
    fireEvent.click(trigger);

    const external = screen.getByRole("group", { name: "External" });
    expect(within(external).getAllByRole("option").map((o) => o.textContent)).toEqual(["DR 30+", "DR 50+"]);
    const internal = screen.getByRole("group", { name: "Internal" });
    expect(within(internal).getByRole("option", { name: "DR 30+ Internal" })).toBeInTheDocument();
  });

  it("applies the clicked link type and closes the list", () => {
    const { onChange, trigger } = renderSelect();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("option", { name: "DR 50+ External" }));

    expect(onChange).toHaveBeenCalledWith("DR 50+ External");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("shows the applied value with its group and marks it as selected", () => {
    const { trigger } = renderSelect("DR 30+ Internal");

    expect(trigger).toHaveTextContent("DR 30+Internal");
    fireEvent.click(trigger);
    expect(screen.getByRole("option", { name: "DR 30+ Internal" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("option", { name: "All link types" })).toHaveAttribute("aria-selected", "false");
  });

  it("clears the applied value from the trigger", () => {
    const { onChange } = renderSelect("DR 50+ External");
    fireEvent.click(screen.getByRole("button", { name: "Clear link type filter" }));

    expect(onChange).toHaveBeenCalledWith("");
  });

  it("can be used from the keyboard", () => {
    const { onChange, trigger } = renderSelect();
    fireEvent.keyDown(trigger, { key: "ArrowDown" });

    const listbox = screen.getByRole("listbox");
    expect(listbox).toHaveFocus();
    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    expect(listbox.getAttribute("aria-activedescendant")).toBe(
      screen.getByRole("option", { name: "DR 50+ External" }).id
    );
    fireEvent.keyDown(listbox, { key: "Enter" });

    expect(onChange).toHaveBeenCalledWith("DR 50+ External");
    expect(trigger).toHaveFocus();
  });

  it("closes on Escape without changing the value", () => {
    const { onChange, trigger } = renderSelect();
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole("listbox"), { key: "Escape" });

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("closes when clicking outside", () => {
    const { trigger } = renderSelect();
    fireEvent.click(trigger);
    fireEvent.mouseDown(document.body);

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
