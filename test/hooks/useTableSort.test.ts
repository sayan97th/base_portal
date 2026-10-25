/**
 * Tests for useTableSort, the multi-column sort state of the admin tables. The
 * Link Building Orders table passes "Order ID, newest first" as its default, so
 * every way of resetting the sort must land back on that default.
 */

import { renderHook, act } from "@testing-library/react";
import { useTableSort } from "@/hooks/useTableSort";
import type { SortRulePayload } from "@/types/admin/backlink-order";

const NEWEST_FIRST: SortRulePayload[] = [{ key: "order_id", direction: "desc", nulls_last: true }];

function renderSort(default_rules: SortRulePayload[] = NEWEST_FIRST) {
  return renderHook(() => useTableSort(default_rules));
}

describe("useTableSort", () => {
  it("starts with the default rules", () => {
    const { result } = renderSort();

    expect(result.current.sort_rules).toEqual(NEWEST_FIRST);
  });

  it("starts unsorted when no default is given", () => {
    const { result } = renderHook(() => useTableSort());

    expect(result.current.sort_rules).toEqual([]);
  });

  it("cycles another column ascending, descending and back to the default", () => {
    const { result } = renderSort();

    act(() => result.current.toggleSort("client", false));
    expect(result.current.sort_rules).toEqual([{ key: "client", direction: "asc", nulls_last: true }]);

    act(() => result.current.toggleSort("client", false));
    expect(result.current.sort_rules).toEqual([{ key: "client", direction: "desc", nulls_last: true }]);

    act(() => result.current.toggleSort("client", false));
    expect(result.current.sort_rules).toEqual(NEWEST_FIRST);
  });

  it("lets the default column be flipped to oldest first and back to newest first", () => {
    const { result } = renderSort();

    act(() => result.current.toggleSort("order_id", false));
    expect(result.current.sort_rules).toEqual([{ key: "order_id", direction: "asc", nulls_last: true }]);

    act(() => result.current.toggleSort("order_id", false));
    expect(result.current.sort_rules).toEqual([{ key: "order_id", direction: "desc", nulls_last: true }]);
  });

  it("adds, flips and removes secondary sorts with Shift+click", () => {
    const { result } = renderSort();

    act(() => result.current.toggleSort("status", true));
    expect(result.current.sort_rules).toEqual([
      ...NEWEST_FIRST,
      { key: "status", direction: "asc", nulls_last: true },
    ]);

    act(() => result.current.toggleSort("status", true));
    expect(result.current.sort_rules[1]).toEqual({ key: "status", direction: "desc", nulls_last: true });

    act(() => result.current.toggleSort("status", true));
    expect(result.current.sort_rules).toEqual(NEWEST_FIRST);
  });

  it("replaces every rule with one explicit sort", () => {
    const { result } = renderSort();

    act(() => result.current.setSort("request_date", "asc"));

    expect(result.current.sort_rules).toEqual([{ key: "request_date", direction: "asc", nulls_last: true }]);
  });

  it("goes back to the default when the sort is cleared", () => {
    const { result } = renderSort();

    act(() => result.current.setSort("client", "asc"));
    act(() => result.current.clearSort());

    expect(result.current.sort_rules).toEqual(NEWEST_FIRST);
  });

  it("restores a saved set of rules, and falls back to the default for an empty list", () => {
    const saved: SortRulePayload[] = [{ key: "status", direction: "asc", nulls_last: true }];
    const { result } = renderSort();

    act(() => result.current.replaceSort(saved));
    expect(result.current.sort_rules).toEqual(saved);

    act(() => result.current.replaceSort([]));
    expect(result.current.sort_rules).toEqual(NEWEST_FIRST);
  });
});
