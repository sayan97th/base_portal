/**
 * Tests for the in-table find (Ctrl/Cmd+F) hook: highlighting several terms at
 * once without filtering rows, and moving through matches on other pages.
 */

import { act, renderHook } from "@testing-library/react";
import { useTableFind } from "@/hooks/useTableFind";

interface TestRow {
  id: string;
  order_id: string;
  client: string;
}

const COLUMN_KEYS = ["order_id", "client"];

const PAGE_ONE: TestRow[] = [
  { id: "a", order_id: "BL-4544", client: "Acme" },
  { id: "b", order_id: "BL-4545", client: "Globex" },
  { id: "c", order_id: "BL-4860", client: "Acme" },
];

const PAGE_THREE: TestRow[] = [
  { id: "x", order_id: "BL-9001", client: "Acme" },
  { id: "y", order_id: "BL-9002", client: "Umbrella" },
];

const getRowId = (row: TestRow) => row.id;
const getCellText = (row: TestRow, col_key: string) => String(row[col_key as keyof TestRow] ?? "");

interface HookProps {
  rows: TestRow[];
  current_page: number;
  pages_with_matches: number[];
}

function renderFind(initial_props: HookProps, onGoToPage = jest.fn(), onNavigateToMatch = jest.fn()) {
  const hook = renderHook(
    ({ rows, current_page, pages_with_matches }: HookProps) =>
      useTableFind({
        rows,
        column_keys: COLUMN_KEYS,
        getRowId,
        getCellText,
        onNavigateToMatch,
        pagination: { current_page, pages_with_matches, onGoToPage },
      }),
    { initialProps: initial_props }
  );

  act(() => {
    hook.result.current.openFind();
  });

  return { ...hook, onGoToPage, onNavigateToMatch };
}

describe("useTableFind", () => {
  it("highlights every term of a comma separated query without dropping rows", () => {
    const { result } = renderFind({ rows: PAGE_ONE, current_page: 1, pages_with_matches: [] });

    act(() => {
      result.current.setFindQuery("BL-4544, bl-4860");
    });

    expect(result.current.find_terms).toEqual(["bl-4544", "bl-4860"]);
    expect(result.current.matches).toEqual([
      { row_id: "a", col_key: "order_id" },
      { row_id: "c", col_key: "order_id" },
    ]);
    expect(result.current.getCellMatchState("a", "order_id")).toBe("current");
    expect(result.current.getCellMatchState("c", "order_id")).toBe("match");
    expect(result.current.getCellMatchState("b", "order_id")).toBeNull();
  });

  it("reports no terms while the find bar is closed", () => {
    const { result } = renderFind({ rows: PAGE_ONE, current_page: 1, pages_with_matches: [] });

    act(() => {
      result.current.setFindQuery("acme");
    });
    act(() => {
      result.current.closeFind();
    });

    expect(result.current.find_terms).toEqual([]);
    expect(result.current.matches).toEqual([]);
  });

  it("wraps around the loaded page when no other page holds matches", () => {
    const { result } = renderFind({ rows: PAGE_ONE, current_page: 1, pages_with_matches: [1] });

    act(() => {
      result.current.setFindQuery("acme");
    });
    act(() => {
      result.current.goToNextMatch();
    });
    expect(result.current.current_match_idx).toBe(1);

    act(() => {
      result.current.goToNextMatch();
    });
    expect(result.current.current_match_idx).toBe(0);
  });

  it("moves to the next page with matches after the last match and lands on its first match", () => {
    const { result, rerender, onGoToPage, onNavigateToMatch } = renderFind({
      rows: PAGE_ONE,
      current_page: 1,
      pages_with_matches: [1, 3],
    });

    act(() => {
      result.current.setFindQuery("acme");
    });
    act(() => {
      result.current.goToNextMatch();
    });
    act(() => {
      result.current.goToNextMatch();
    });

    expect(onGoToPage).toHaveBeenCalledWith(3);
    expect(result.current.is_changing_page).toBe(true);

    rerender({ rows: PAGE_THREE, current_page: 3, pages_with_matches: [1, 3] });

    expect(result.current.is_changing_page).toBe(false);
    expect(result.current.current_match_idx).toBe(0);
    expect(onNavigateToMatch).toHaveBeenLastCalledWith({ row_id: "x", col_key: "client" });
  });

  it("moves back to the previous page with matches and lands on its last match", () => {
    const { result, rerender, onGoToPage } = renderFind({
      rows: PAGE_THREE,
      current_page: 3,
      pages_with_matches: [1, 3],
    });

    act(() => {
      result.current.setFindQuery("acme");
    });
    act(() => {
      result.current.goToPreviousMatch();
    });

    expect(onGoToPage).toHaveBeenCalledWith(1);

    rerender({ rows: PAGE_ONE, current_page: 1, pages_with_matches: [1, 3] });

    expect(result.current.current_match_idx).toBe(1);
    expect(result.current.getCellMatchState("c", "client")).toBe("current");
  });

  it("jumps to another page when the loaded page has no match at all", () => {
    const { result, onGoToPage } = renderFind({ rows: PAGE_ONE, current_page: 1, pages_with_matches: [3] });

    act(() => {
      result.current.setFindQuery("umbrella");
    });
    act(() => {
      result.current.goToNextMatch();
    });

    expect(onGoToPage).toHaveBeenCalledWith(3);
  });
});
