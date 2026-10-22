"use client";

import { useEffect, useState } from "react";
import { getLinkBuildingOrderQuickFilterValues } from "@/services/admin/link-building-dashboard.service";
import type {
  LinkBuildingOrderQuickFilterValuesResponse,
  LinkBuildingOrderSearchBody,
} from "@/types/admin/link-building-order";

/**
 * Values listed per column, enough to list every client name of the Company
 * column today. Columns with more values are searched on the server instead.
 */
const QUICK_FILTER_VALUES_LIMIT = 200;

const NO_VALUES: LinkBuildingOrderQuickFilterValuesResponse["data"] = {};

/**
 * Loads the Quick filters values (and the unfiltered row total) while the panel is
 * open, and again whenever the table's filters change, so every count matches the
 * table. The previous response stays on screen while the next one loads. With a
 * `value_search`, each value column only lists the values containing it.
 */
export function useQuickFilterValues(
  columns: string[],
  body: LinkBuildingOrderSearchBody,
  is_enabled: boolean,
  value_search = ""
) {
  const request_key = JSON.stringify([columns, body, value_search]);
  const [load_result, setLoadResult] = useState<{
    request_key: string;
    response: LinkBuildingOrderQuickFilterValuesResponse | null;
    has_error: boolean;
  } | null>(null);

  useEffect(() => {
    if (!is_enabled) return;
    let is_cancelled = false;
    const [request_columns, request_body, request_value_search] = JSON.parse(request_key) as [
      string[],
      LinkBuildingOrderSearchBody,
      string,
    ];
    getLinkBuildingOrderQuickFilterValues(request_columns, request_body, QUICK_FILTER_VALUES_LIMIT, request_value_search)
      .then((response) => {
        if (!is_cancelled) setLoadResult({ request_key, response, has_error: false });
      })
      .catch(() => {
        if (!is_cancelled) setLoadResult((prev) => ({ request_key, response: prev?.response ?? null, has_error: true }));
      });
    return () => {
      is_cancelled = true;
    };
  }, [is_enabled, request_key]);

  return {
    values_by_column: load_result?.response?.data ?? NO_VALUES,
    total_count: load_result?.response?.total ?? null,
    is_loading: is_enabled && load_result?.request_key !== request_key,
    has_error: load_result?.request_key === request_key && load_result.has_error,
  };
}
