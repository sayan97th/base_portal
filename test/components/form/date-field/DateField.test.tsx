/**
 * Tests for the compact calendar date field (src/components/form/date-field/DateField.tsx).
 *
 * "Today" is frozen on Sunday, November 22, 2026, so every assertion about
 * which days are selectable is stable.
 */

import React, { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import DateField, { parseIsoDate, toIsoDate } from "@/components/form/date-field/DateField";

function ControlledDateField(props: Partial<React.ComponentProps<typeof DateField>> & { initial?: string }) {
  const { initial = "", onChange, ...rest } = props;
  const [value, setValue] = useState(initial);
  return (
    <DateField
      aria_label="Billing date"
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
      {...rest}
    />
  );
}

function openCalendar() {
  fireEvent.click(screen.getByRole("button", { name: "Billing date" }));
  return screen.getByRole("dialog", { name: "Choose a date" });
}

function dayButton(label: string) {
  return screen.getByRole("gridcell", { name: label });
}

describe("DateField", () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date(2026, 10, 22, 10, 0) });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("converts between ISO strings and local dates", () => {
    expect(toIsoDate(new Date(2027, 1, 3))).toBe("2027-02-03");
    expect(parseIsoDate("2026-12-01")?.getDate()).toBe(1);
    expect(parseIsoDate("")).toBeNull();
    expect(parseIsoDate("12/01/2026")).toBeNull();
  });

  it("shows the placeholder, then the formatted value", () => {
    const { rerender } = render(<DateField aria_label="Billing date" value="" onChange={jest.fn()} placeholder="Pick a day" />);
    expect(screen.getByText("Pick a day")).toBeInTheDocument();

    rerender(<DateField aria_label="Billing date" value="2026-12-01" onChange={jest.fn()} />);
    expect(screen.getByText("Tue, Dec 1, 2026")).toBeInTheDocument();
  });

  it("opens on the month of the value and selects a day", () => {
    const on_change = jest.fn();
    render(<ControlledDateField initial="2026-12-01" onChange={on_change} />);

    const dialog = openCalendar();
    expect(within(dialog).getByRole("button", { name: "Choose month and year" })).toHaveTextContent("December 2026");

    fireEvent.click(dayButton("Tuesday, December 15, 2026"));

    expect(on_change).toHaveBeenCalledWith("2026-12-15");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Tue, Dec 15, 2026")).toBeInTheDocument();
  });

  it("opens on the current month when empty and marks today", () => {
    render(<ControlledDateField />);
    openCalendar();

    expect(dayButton("Sunday, November 22, 2026")).toHaveAttribute("aria-current", "date");
  });

  it("blocks days and months outside min and max", () => {
    render(<ControlledDateField min="2026-11-22" max="2026-12-10" />);
    const dialog = openCalendar();

    expect(dayButton("Saturday, November 21, 2026")).toBeDisabled();
    expect(dayButton("Sunday, November 22, 2026")).toBeEnabled();
    expect(within(dialog).getByRole("button", { name: "Previous month" })).toBeDisabled();

    fireEvent.click(within(dialog).getByRole("button", { name: "Next month" }));
    expect(dayButton("Friday, December 11, 2026")).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "Next month" })).toBeDisabled();
  });

  it("ignores clicks on disabled days", () => {
    const on_change = jest.fn();
    render(<ControlledDateField min="2026-11-22" onChange={on_change} />);
    openCalendar();

    fireEvent.click(dayButton("Friday, November 20, 2026"));

    expect(on_change).not.toHaveBeenCalled();
  });

  it("can be used with the keyboard", () => {
    const on_change = jest.fn();
    render(<ControlledDateField initial="2026-11-30" onChange={on_change} />);
    openCalendar();

    const grid = screen.getByRole("grid");
    fireEvent.keyDown(grid, { key: "ArrowRight" });
    fireEvent.keyDown(grid, { key: "ArrowDown" });
    fireEvent.keyDown(grid, { key: "Enter" });

    // Nov 30 + 1 day + 1 week crosses into December.
    expect(on_change).toHaveBeenCalledWith("2026-12-08");
  });

  it("closes with Escape and on an outside click without changing the value", () => {
    const on_change = jest.fn();
    render(
      <div>
        <ControlledDateField initial="2026-12-01" onChange={on_change} />
        <button type="button">Elsewhere</button>
      </div>
    );

    fireEvent.keyDown(openCalendar(), { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    openCalendar();
    fireEvent.mouseDown(screen.getByRole("button", { name: "Elsewhere" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(on_change).not.toHaveBeenCalled();
  });

  it("picks today from the footer", () => {
    const on_change = jest.fn();
    render(<ControlledDateField initial="2027-03-10" onChange={on_change} />);
    openCalendar();

    fireEvent.click(screen.getByRole("button", { name: "Today" }));

    expect(on_change).toHaveBeenCalledWith("2026-11-22");
  });

  it("hides Today when today is outside the allowed range", () => {
    render(<ControlledDateField min="2026-12-01" />);
    openCalendar();

    expect(screen.queryByRole("button", { name: "Today" })).not.toBeInTheDocument();
  });

  it("can be cleared when clearable", () => {
    const on_change = jest.fn();
    render(<ControlledDateField initial="2026-12-01" clearable onChange={on_change} placeholder="Never" />);

    fireEvent.click(screen.getByRole("button", { name: "Clear date" }));
    expect(on_change).toHaveBeenLastCalledWith("");
    expect(screen.getByText("Never")).toBeInTheDocument();
  });

  it("offers Clear in the footer only when clearable and set", () => {
    const { unmount } = render(<ControlledDateField initial="2026-12-01" />);
    openCalendar();
    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
    unmount();

    const on_change = jest.fn();
    render(<ControlledDateField initial="2026-12-01" clearable onChange={on_change} />);
    openCalendar();
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(on_change).toHaveBeenCalledWith("");
  });

  it("jumps to another month from the month view", () => {
    render(<ControlledDateField initial="2026-12-01" />);
    const dialog = openCalendar();

    fireEvent.click(within(dialog).getByRole("button", { name: "Choose month and year" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Next year" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Mar" }));

    expect(within(dialog).getByRole("button", { name: "Choose month and year" })).toHaveTextContent("March 2027");
    expect(dayButton("Monday, March 15, 2027")).toBeInTheDocument();
  });

  it("disables months outside the range in the month view", () => {
    render(<ControlledDateField min="2026-11-22" />);
    const dialog = openCalendar();

    fireEvent.click(within(dialog).getByRole("button", { name: "Choose month and year" }));

    expect(within(dialog).getByRole("button", { name: "Oct" })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "Nov" })).toBeEnabled();
  });

  it("shows the footer hint and does not open when disabled", () => {
    const { rerender } = render(<DateField aria_label="Billing date" value="" onChange={jest.fn()} footer_hint="Sets the billing day" />);
    openCalendar();
    expect(screen.getByText("Sets the billing day")).toBeInTheDocument();

    rerender(<DateField aria_label="Billing date" value="" onChange={jest.fn()} disabled />);
    expect(screen.getByRole("button", { name: "Billing date" })).toBeDisabled();
  });
});
