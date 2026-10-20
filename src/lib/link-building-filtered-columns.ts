import type { LinkBuildingOrderAdvancedFilters } from "@/types/admin/link-building-order";
import {
  describeSheetFilter,
  isSheetFilterActive,
  type SheetColumnFilters,
} from "@/hooks/useSheetColumnFilters";
import {
  describeAdvancedRuleCondition,
  isAdvancedRuleActive,
  type AdvancedFilterColumn,
} from "./link-building-advanced-filters";

/**
 * Works out which columns of the Link Building Orders grid currently narrow the
 * rows, so their headers can be marked. A column can be filtered from several
 * places at once: its own header filter (or a Quick filters pick, which is stored
 * the same way), the status bar and toolbar quick filters, the Client Account and
 * Assigned To pickers, and the Advanced filters rules. Everything here is pure so
 * the table and the tests share one definition.
 */

/** Where a column's filter was set. */
export type ColumnFilterSource = "column" | "quick" | "advanced";

export interface ColumnFilterIndicator {
  /** Distinct sources, in the order they were found. */
  sources: ColumnFilterSource[];
  /** One readable line per active filter, used for the header tooltip. */
  descriptions: string[];
}

export type FilteredColumns = Record<string, ColumnFilterIndicator>;

/** Column keys of the two user columns filtered by their own pickers. */
export const CLIENT_ACCOUNT_COLUMN_KEY = "user_id";
export const ASSIGNED_USER_COLUMN_KEY = "assigned_admin_user_id";

export interface FilteredColumnsInput {
  sheet_filters: SheetColumnFilters;
  advanced_filters: LinkBuildingOrderAdvancedFilters;
  advanced_filter_columns: AdvancedFilterColumn[];
  status_filter: string;
  link_type_filter: string;
  client_filter: string;
  needs_approval_filter: boolean;
  /** Readable name of the picked client account, or null when it is not filtered. */
  client_account_filter_label: string | null;
  /** Readable name of the picked admin user, or null when it is not filtered. */
  assigned_user_filter_label: string | null;
}

const SOURCE_PREFIXES: Record<ColumnFilterSource, string> = {
  column: "Column filter",
  quick: "Quick filter",
  advanced: "Advanced filter",
};

const SOURCE_LABELS: Record<ColumnFilterSource, string> = {
  column: "column",
  quick: "quick",
  advanced: "advanced",
};

function addIndicator(
  filtered_columns: FilteredColumns,
  column_key: string,
  source: ColumnFilterSource,
  description: string
): void {
  const indicator = filtered_columns[column_key] ?? { sources: [], descriptions: [] };
  if (!indicator.sources.includes(source)) indicator.sources.push(source);
  indicator.descriptions.push(`${SOURCE_PREFIXES[source]}: ${description}`);
  filtered_columns[column_key] = indicator;
}

export function getFilteredColumns(input: FilteredColumnsInput): FilteredColumns {
  const filtered_columns: FilteredColumns = {};

  Object.entries(input.sheet_filters).forEach(([column_key, filter]) => {
    if (filter && isSheetFilterActive(filter)) {
      addIndicator(filtered_columns, column_key, "column", describeSheetFilter(filter));
    }
  });

  if (input.needs_approval_filter) {
    addIndicator(filtered_columns, "status", "quick", "Live, needs LB TL Approval");
  } else if (input.status_filter) {
    addIndicator(filtered_columns, "status", "quick", input.status_filter);
  }
  if (input.link_type_filter) {
    addIndicator(filtered_columns, "link_type", "quick", input.link_type_filter);
  }
  if (input.client_filter.trim()) {
    addIndicator(filtered_columns, "client", "quick", `contains "${input.client_filter.trim()}"`);
  }
  if (input.client_account_filter_label !== null) {
    addIndicator(filtered_columns, CLIENT_ACCOUNT_COLUMN_KEY, "quick", input.client_account_filter_label);
  }
  if (input.assigned_user_filter_label !== null) {
    addIndicator(filtered_columns, ASSIGNED_USER_COLUMN_KEY, "quick", input.assigned_user_filter_label);
  }

  const advanced_rules = [
    ...input.advanced_filters.rules,
    ...input.advanced_filters.groups.flatMap((group) => group.rules),
  ];
  advanced_rules.filter(isAdvancedRuleActive).forEach((rule) => {
    if (!rule.key) return;
    addIndicator(
      filtered_columns,
      rule.key,
      "advanced",
      describeAdvancedRuleCondition(rule, input.advanced_filter_columns)
    );
  });

  return filtered_columns;
}

/** Header tooltip of a filtered column, e.g. "Status is filtered\nQuick filter: Live". */
export function describeColumnFilterIndicator(column_label: string, indicator: ColumnFilterIndicator): string {
  return [`${column_label} is filtered`, ...indicator.descriptions].join("\n");
}

/** Short screen reader label, e.g. "filtered by column and advanced filters". */
export function describeColumnFilterSources(indicator: ColumnFilterIndicator): string {
  const labels = indicator.sources.map((source) => SOURCE_LABELS[source]);
  const joined = labels.length > 1 ? `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}` : labels[0];
  return `filtered by ${joined} ${labels.length > 1 ? "filters" : "filter"}`;
}
