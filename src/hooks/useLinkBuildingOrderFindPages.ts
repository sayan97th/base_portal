import { useEffect, useMemo, useRef, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { findLinkBuildingOrderPages } from "@/services/admin/link-building-dashboard.service";
import type { LinkBuildingOrderFindPage, LinkBuildingOrderSearchBody } from "@/types/admin/link-building-order";

/** Typing pause before the API is asked where the matches are. */
const FIND_PAGES_DEBOUNCE_MS = 300;

interface UseLinkBuildingOrderFindPagesOptions {
  /** Normalized find terms, empty while the find bar is closed or blank. */
  find_terms: string[];
  /** Columns shown on screen, so matches in hidden columns are not reported. */
  find_columns: string[];
  /** Filters and sort of the rows on screen, so pages line up with the pagination. */
  search_body: LinkBuildingOrderSearchBody;
  per_page: number;
  /** Changes whenever the loaded rows are refetched, so counts follow edits and imports. */
  refresh_key: number;
}

interface FindPagesState {
  /** query_key the result belongs to, so a result for other terms or filters is never shown. */
  resolved_query_key: string;
  pages: LinkBuildingOrderFindPage[];
  matched_row_count: number;
  has_error: boolean;
}

const IDLE_STATE: FindPagesState = {
  resolved_query_key: "",
  pages: [],
  matched_row_count: 0,
  has_error: false,
};
const NO_PAGES: number[] = [];

/**
 * Asks the API which pages of the current result set hold rows matching the
 * in-table find terms, so find can reach orders that are not on the loaded page.
 */
export function useLinkBuildingOrderFindPages({
  find_terms,
  find_columns,
  search_body,
  per_page,
  refresh_key,
}: UseLinkBuildingOrderFindPagesOptions) {
  const [state, setState] = useState<FindPagesState>(IDLE_STATE);
  const request_id_ref = useRef(0);

  // Serialized so a new request is only sent when something it depends on changed.
  // query_key leaves the refresh out: a refresh keeps showing the previous result
  // until the new one arrives, while new terms or filters drop it right away.
  const query_key = useMemo(
    () => (find_terms.length === 0 ? "" : JSON.stringify({ find_terms, find_columns, search_body, per_page })),
    [find_terms, find_columns, search_body, per_page]
  );
  const request_key = query_key === "" ? "" : `${refresh_key}|${query_key}`;
  const debounced_request_key = useDebounce(request_key, FIND_PAGES_DEBOUNCE_MS);

  useEffect(() => {
    const request_id = ++request_id_ref.current;

    // Nothing to look up, the result is hidden because its key no longer matches.
    if (!debounced_request_key) return;

    const requested_query_key = debounced_request_key.slice(debounced_request_key.indexOf("|") + 1);
    const { find_terms, find_columns, search_body, per_page } = JSON.parse(requested_query_key) as {
      find_terms: string[];
      find_columns: string[];
      search_body: LinkBuildingOrderSearchBody;
      per_page: number;
    };

    findLinkBuildingOrderPages({ ...search_body, find_terms, find_columns, per_page })
      .then((res) => {
        if (request_id !== request_id_ref.current) return;
        setState({
          resolved_query_key: requested_query_key,
          pages: res.pages,
          matched_row_count: res.matched_row_count,
          has_error: false,
        });
      })
      .catch(() => {
        if (request_id !== request_id_ref.current) return;
        // Find keeps working on the loaded page, only the other pages are unknown.
        setState({ ...IDLE_STATE, resolved_query_key: requested_query_key, has_error: true });
      });
  }, [debounced_request_key]);

  const pages_with_matches = useMemo(() => state.pages.map((page) => page.page), [state.pages]);

  const is_current = query_key !== "" && state.resolved_query_key === query_key;

  return {
    pages: is_current ? state.pages : IDLE_STATE.pages,
    pages_with_matches: is_current ? pages_with_matches : NO_PAGES,
    matched_row_count: is_current ? state.matched_row_count : 0,
    /** True until the result for the current terms and filters has arrived (a refresh keeps the old one). */
    is_loading: query_key !== "" && !is_current,
    has_error: is_current && state.has_error,
  };
}
