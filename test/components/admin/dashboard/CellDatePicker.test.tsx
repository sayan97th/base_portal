/**
 * Tests for the calendar popover of the date cells in the Link Building Orders table:
 * the month grid, the month and year views, Today, Clear and quick picks, and where
 * the panel sits next to its cell. The table level flow (open, pick, save) lives in
 * LinkBuildingOrdersTable.datePicker.test.tsx.
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

  it("marks today and the quick pick matching the cell", () => {
    renderPicker("10/26/2026");
    expect(screen.getByRole("gridcell", { name: "Sunday, October 25, 2026" })).toHaveAttribute("aria-current", "date");
    expect(screen.getByRole("gridcell", { name: "Monday, October 26, 2026" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("button", { name: "Tomorrow" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "+7 days" })).toHaveAttribute("aria-pressed", "false");
  });

  it("always shows six weeks, starting on the Sunday before the first day", () => {
    renderPicker("10/25/2026");
    const cells = screen.getAllByRole("gridcell");
    expect(cells).toHaveLength(42);
    expect(cells[0]).toHaveAccessibleName("Sunday, September 27, 2026");
    expect(cells[41]).toHaveAccessibleName("Saturday, November 7, 2026");
  });

  it("a day of the next month shown in the grid can be picked directly", () => {
    const { onSelect } = renderPicker("10/25/2026");
    fireEvent.click(screen.getByRole("gridcell", { name: "Saturday, November 7, 2026" }));
    expect(onSelect).toHaveBeenCalledWith("11/07/2026");
  });

  it("going back from January lands on December of the year before", () => {
    renderPicker("01/15/2026");
    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
    expect(screen.getByRole("grid", { name: "December 2025" })).toBeInTheDocument();
  });

  it("the arrows step a year in the month view and twelve years in the year view", () => {
    renderPicker("10/25/2026");
    fireEvent.click(screen.getByRole("button", { name: /^Oct/ }));
    fireEvent.click(screen.getByRole("button", { name: "Next year" }));
    expect(screen.getByRole("button", { name: /^2027/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^2027/ }));
    expect(screen.getByRole("button", { name: "2023" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Previous years" }));
    expect(screen.getByRole("button", { name: "2011" })).toBeInTheDocument();
  });

  it("toggles a view closed when its label is clicked again", () => {
    renderPicker("10/25/2026");
    const month_label = screen.getByRole("button", { name: /^Oct/ });
    fireEvent.click(month_label);
    expect(month_label).toHaveAttribute("aria-expanded", "true");
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();

    fireEvent.click(month_label);
    expect(screen.getByRole("grid", { name: "October 2026" })).toBeInTheDocument();
  });

  it("explains text that is not a date yet", () => {
    renderPicker("13/45/2026");
    expect(screen.getByText("Not a date yet, type MM/DD/YYYY or pick a day")).toBeInTheDocument();
    expect(screen.getByRole("grid", { name: "October 2026" })).toBeInTheDocument();
  });

  it("renders nothing without a cell to anchor to", () => {
    render(<CellDatePicker value="10/25/2026" anchor_el={null} onSelect={jest.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

// ─── Position ────────────────────────────────────────────────────────────────

describe("CellDatePicker position", () => {
  const PANEL_HEIGHT = 420;

  function rect(top: number, left: number, width = 120, height = 34): DOMRect {
    return { top, left, width, height, bottom: top + height, right: left + width, x: left, y: top, toJSON: () => ({}) } as DOMRect;
  }

  function renderAt(anchor_rect: DOMRect) {
    const anchor_el = document.createElement("td");
    document.body.appendChild(anchor_el);
    anchor_el.getBoundingClientRect = jest.fn(() => anchor_rect);
    render(<CellDatePicker value="10/25/2026" anchor_el={anchor_el} onSelect={jest.fn()} />);
    return { anchor_el, panel: screen.getByRole("dialog", { name: "Choose a date" }) };
  }

  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, get: () => PANEL_HEIGHT });
  });

  afterAll(() => {
    delete (HTMLElement.prototype as { offsetHeight?: number }).offsetHeight;
  });

  beforeEach(() => {
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 900 });
    Object.defineProperty(document.documentElement, "clientWidth", { configurable: true, value: 1200 });
  });

  it("opens right under the cell, aligned with its left edge", () => {
    const { panel } = renderAt(rect(100, 300));
    expect(panel.style.top).toBe("138px");
    expect(panel.style.left).toBe("300px");
    expect(panel.style.visibility).toBe("visible");
  });

  it("opens above the cell when there is no room below", () => {
    const { panel } = renderAt(rect(700, 300));
    expect(panel.style.top).toBe(`${700 - PANEL_HEIGHT - 4}px`);
  });

  it("stays inside the viewport next to the right edge", () => {
    const { panel } = renderAt(rect(100, 1100));
    expect(panel.style.left).toBe(`${1200 - 288 - 8}px`);
  });

  it("follows the cell when the table scrolls, and stops listening once closed", () => {
    const anchor_el = document.createElement("td");
    document.body.appendChild(anchor_el);
    let anchor_rect = rect(100, 300);
    anchor_el.getBoundingClientRect = jest.fn(() => anchor_rect);
    const remove_listener = jest.spyOn(window, "removeEventListener");
    const { unmount } = render(<CellDatePicker value="10/25/2026" anchor_el={anchor_el} onSelect={jest.fn()} />);
    const panel = screen.getByRole("dialog", { name: "Choose a date" });

    anchor_rect = rect(60, 300);
    fireEvent.scroll(window);
    expect(panel.style.top).toBe("98px");

    unmount();
    expect(remove_listener).toHaveBeenCalledWith("scroll", expect.any(Function), true);
    expect(remove_listener).toHaveBeenCalledWith("resize", expect.any(Function));
    remove_listener.mockRestore();
  });
});
