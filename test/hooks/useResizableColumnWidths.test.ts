/**
 * Tests for the Google Sheets style column resizing used by the admin Link
 * Building Orders spreadsheet: default widths, dragging a column edge, the
 * min/max clamp, localStorage persistence and resetting.
 */

import { act, renderHook } from "@testing-library/react";
import type React from "react";
import {
  MAX_COLUMN_WIDTH,
  MIN_COLUMN_WIDTH,
  useResizableColumnWidths,
} from "@/hooks/useResizableColumnWidths";

const STORAGE_KEY = "test_column_widths";
const DEFAULT_WIDTHS = { keyword: 200, client: 120 };

function mouseDownAt(client_x: number): React.MouseEvent {
  return { clientX: client_x, preventDefault: jest.fn(), stopPropagation: jest.fn() } as unknown as React.MouseEvent;
}

function dragColumn(
  result: { current: ReturnType<typeof useResizableColumnWidths> },
  col_key: string,
  from_x: number,
  to_x: number
): void {
  act(() => result.current.startColumnResize(col_key, mouseDownAt(from_x)));
  act(() => {
    window.dispatchEvent(new MouseEvent("mousemove", { clientX: to_x }));
  });
  act(() => {
    window.dispatchEvent(new MouseEvent("mouseup"));
  });
}

beforeEach(() => {
  localStorage.clear();
});

describe("useResizableColumnWidths", () => {
  it("returns the default width until a column is resized", () => {
    const { result } = renderHook(() => useResizableColumnWidths(STORAGE_KEY, DEFAULT_WIDTHS));
    expect(result.current.getColumnWidth("keyword")).toBe(200);
    expect(result.current.has_custom_widths).toBe(false);
  });

  it("dragging a column edge changes its width and saves it", () => {
    const { result } = renderHook(() => useResizableColumnWidths(STORAGE_KEY, DEFAULT_WIDTHS));

    dragColumn(result, "keyword", 500, 560);

    expect(result.current.getColumnWidth("keyword")).toBe(260);
    expect(result.current.resizing_col_key).toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}")).toEqual({ keyword: 260 });
  });

  it("clamps the width between the minimum and maximum", () => {
    const { result } = renderHook(() => useResizableColumnWidths(STORAGE_KEY, DEFAULT_WIDTHS));

    dragColumn(result, "client", 500, 0);
    expect(result.current.getColumnWidth("client")).toBe(MIN_COLUMN_WIDTH);

    dragColumn(result, "client", 0, 5000);
    expect(result.current.getColumnWidth("client")).toBe(MAX_COLUMN_WIDTH);
  });

  it("restores saved widths on the next mount and ignores malformed entries", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ keyword: 310, client: "wide" }));
    const { result } = renderHook(() => useResizableColumnWidths(STORAGE_KEY, DEFAULT_WIDTHS));

    expect(result.current.getColumnWidth("keyword")).toBe(310);
    expect(result.current.getColumnWidth("client")).toBe(120);
  });

  it("resets one column, or every column, back to the defaults", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ keyword: 310, client: 90 }));
    const { result } = renderHook(() => useResizableColumnWidths(STORAGE_KEY, DEFAULT_WIDTHS));

    act(() => result.current.resetColumnWidth("keyword"));
    expect(result.current.getColumnWidth("keyword")).toBe(200);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}")).toEqual({ client: 90 });

    act(() => result.current.resetAllColumnWidths());
    expect(result.current.getColumnWidth("client")).toBe(120);
    expect(result.current.has_custom_widths).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
