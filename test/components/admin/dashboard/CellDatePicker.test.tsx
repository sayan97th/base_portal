/**
 * Tests for the calendar popover of the date cells in the Link Building Orders table.
 */

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import CellDatePicker from "@/components/admin/dashboard/CellDatePicker";

function renderPicker(value: string) {
  const anchor_el = document.createElement("td");
  document.body.appendChild(anchor_el);
  const onSelect = jest.fn();
  const utils = render(<CellDatePicker value={value} anchor_el={anchor_el} onSelect={onSelect} />);
  return { ...utils, onSelect };
}

describe("CellDatePicker", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 9, 25, 10, 30));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("opens on the cell's month with its day selected", () => {
    renderPicker("03/14/2026");
    expect(screen.getByRole("button", { name: /^Mar/ })).toBeInTheDocument();
    expect(screen.getByRole("gridcell", { name: "Saturday, March 14, 2026" })).toHaveAttribute("aria-selected", "true");
  });

  it("commits a clicked day as MM/DD/YYYY", () => {
    const { onSelect } = renderPicker("10/25/2026");
    fireEvent.click(screen.getByRole("gridcell", { name: "Friday, October 30, 2026" }));
    expect(onSelect).toHaveBeenCalledWith("10/30/2026");
  });

  it("keeps the cell input focused when the panel is pressed", () => {
    renderPicker("");
    const day = screen.getByRole("gridcell", { name: "Monday, October 26, 2026" });
    const mouse_down = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
    day.dispatchEvent(mouse_down);
    expect(mouse_down.defaultPrevented).toBe(true);
  });

  it("picks today, clears and applies quick picks", () => {
    const { onSelect } = renderPicker("01/02/2026");
    fireEvent.click(screen.getByRole("button", { name: "Today" }));
    expect(onSelect).toHaveBeenLastCalledWith("10/25/2026");
    fireEvent.click(screen.getByRole("button", { name: "Clear date" }));
    expect(onSelect).toHaveBeenLastCalledWith("");
    fireEvent.click(screen.getByRole("button", { name: "+7 days" }));
    expect(onSelect).toHaveBeenLastCalledWith("11/01/2026");
  });

  it("disables Clear when the cell is empty and opens on today's month", () => {
    renderPicker("");
    expect(screen.getByRole("button", { name: "Clear date" })).toBeDisabled();
    expect(screen.getByRole("grid", { name: "October 2026" })).toBeInTheDocument();
  });

  it("navigates months and jumps through the month and year views", () => {
    renderPicker("10/25/2026");
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.getByRole("grid", { name: "November 2026" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^2026/ }));
    fireEvent.click(screen.getByRole("button", { name: "2027" }));
    expect(screen.getByRole("grid", { name: "November 2027" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Nov/ }));
    fireEvent.click(screen.getByRole("button", { name: "Feb" }));
    expect(screen.getByRole("grid", { name: "February 2027" })).toBeInTheDocument();
  });

  it("follows a date typed into the cell", () => {
    const { rerender, onSelect } = renderPicker("");
    const anchor_el = document.querySelector("td");
    rerender(<CellDatePicker value="07/04/2027" anchor_el={anchor_el} onSelect={onSelect} />);
    expect(screen.getByRole("grid", { name: "July 2027" })).toBeInTheDocument();
    expect(screen.getByText("Sunday, July 4, 2027", { selector: "span" })).toBeInTheDocument();
  });
});
