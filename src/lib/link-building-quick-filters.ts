import type { LinkBuildingOrderQuickFilterColumnValues } from "@/types/admin/link-building-order";

/**
 * Helpers for the Link Building Orders "Quick filters" panel, the monday style
 * grid of columns whose values are picked with one click. Picks on a regular
 * column are stored as that column's "Filter by values" selection, so they are
 * saved, restored and listed as chips like any other column filter. Picks on
 * "Assigned To" and "Client Account" use their own single user filters.
 */

/** Key of the Assigned To column in the quick filter values API. */
export const ASSIGNED_USER_QUICK_FILTER_KEY = "assigned_admin_user_id";

/** Key of the Client Account column in the quick filter values API. */
export const CLIENT_ACCOUNT_QUICK_FILTER_KEY = "user_id";

/** Columns whose values are user ids rather than displayed text. */
export function isUserQuickFilterKey(key: string): boolean {
  return key === ASSIGNED_USER_QUICK_FILTER_KEY || key === CLIENT_ACCOUNT_QUICK_FILTER_KEY;
}

export interface QuickFilterColumn {
  key: string;
  label: string;
  /** Fixed values always listed, even when no row holds them right now (e.g. every Status). */
  options?: string[];
  /** Tailwind classes of the dot shown before each value, by value. */
  dot_classes?: Record<string, string>;
  default_dot_class?: string;
}

export interface QuickFilterOption {
  value: string;
  label: string;
  count: number;
  dot_class?: string;
  /** Shown instead of a dot on the Assigned To and Client Account columns. */
  avatar?: { name: string; url: string | null };
}

export interface QuickFilterFacet {
  key: string;
  label: string;
  options: QuickFilterOption[];
  selected_values: string[];
  has_more: boolean;
}

export interface QuickFilterUser {
  id: number;
  name: string;
  avatar_url: string | null;
}

/** "" is how blank cells come back from the API, shown as "(Blanks)". */
function formatValue(value: string): string {
  return value === "" ? "(Blanks)" : value;
}

function buildValueOptions(
  column: QuickFilterColumn,
  column_values: LinkBuildingOrderQuickFilterColumnValues | undefined,
  selected_values: string[]
): QuickFilterOption[] {
  const counts = new Map((column_values?.values ?? []).map((item) => [item.value, item.count]));
  // Fixed options keep their own order, then any other value found in the data,
  // then picked values the current data no longer holds, and blanks last.
  const ordered = Array.from(
    new Set([...(column.options ?? []), ...counts.keys(), ...selected_values])
  ).sort((a, b) => Number(a === "") - Number(b === ""));

  return ordered.map((value) => ({
    value,
    label: formatValue(value),
    count: counts.get(value) ?? 0,
    dot_class: column.dot_classes ? column.dot_classes[value] ?? column.default_dot_class : undefined,
  }));
}

function buildUserOptions(
  column_values: LinkBuildingOrderQuickFilterColumnValues | undefined,
  selected_values: string[],
  users: QuickFilterUser[],
  {
    current_user_id,
    unknown_label,
    empty_label,
  }: { current_user_id: number | null; unknown_label: string; empty_label: string }
): QuickFilterOption[] {
  const counts = new Map((column_values?.values ?? []).map((item) => [item.value, item.count]));
  const users_by_id = new Map(users.map((user) => [String(user.id), user]));
  const ids = Array.from(new Set([...counts.keys(), ...selected_values])).filter((id) => id !== "" && id !== "0");

  const user_options = ids
    .map((id): QuickFilterOption => {
      const user = users_by_id.get(id);
      const name = user?.name ?? `${unknown_label} #${id}`;
      return {
        value: id,
        label: String(current_user_id) === id ? "Me" : name,
        count: counts.get(id) ?? 0,
        avatar: { name, url: user?.avatar_url ?? null },
      };
    })
    // "Me" first, then by name, like monday's Owner column.
    .sort((a, b) => Number(b.label === "Me") - Number(a.label === "Me") || a.label.localeCompare(b.label));

  // Rows without a user are picked with "0", see the API's assigned_user_id and client_user_id.
  const empty_count = counts.get("") ?? 0;
  if (empty_count > 0 || selected_values.includes("0")) {
    user_options.push({ value: "0", label: empty_label, count: empty_count, avatar: { name: "", url: null } });
  }
  return user_options;
}

function buildFacetOptions(
  column: QuickFilterColumn,
  column_values: LinkBuildingOrderQuickFilterColumnValues | undefined,
  selected_values: string[],
  users: QuickFilterUser[],
  client_users: QuickFilterUser[],
  current_user_id: number | null
): QuickFilterOption[] {
  if (column.key === ASSIGNED_USER_QUICK_FILTER_KEY) {
    return buildUserOptions(column_values, selected_values, users, {
      current_user_id,
      unknown_label: "User",
      empty_label: "Unassigned",
    });
  }
  if (column.key === CLIENT_ACCOUNT_QUICK_FILTER_KEY) {
    return buildUserOptions(column_values, selected_values, client_users, {
      current_user_id: null,
      unknown_label: "Client",
      empty_label: "No client account",
    });
  }
  return buildValueOptions(column, column_values, selected_values);
}

/** Builds every facet of the Quick filters panel from the API response and the current picks. */
export function buildQuickFilterFacets({
  columns,
  values_by_column,
  selections,
  users,
  client_users = [],
  current_user_id,
}: {
  columns: QuickFilterColumn[];
  values_by_column: Partial<Record<string, LinkBuildingOrderQuickFilterColumnValues>>;
  selections: Partial<Record<string, string[]>>;
  /** Admins listed by Assigned To. */
  users: QuickFilterUser[];
  /** Client accounts listed by Client Account, named by their company when they have one. */
  client_users?: QuickFilterUser[];
  current_user_id: number | null;
}): QuickFilterFacet[] {
  return columns.map((column) => {
    const column_values = values_by_column[column.key];
    const selected_values = selections[column.key] ?? [];
    return {
      key: column.key,
      label: column.label,
      selected_values,
      has_more: column_values?.has_more ?? false,
      options: buildFacetOptions(column, column_values, selected_values, users, client_users, current_user_id),
    };
  });
}

/**
 * Columns whose values must be searched on the server for the panel's search
 * text: the ones that list only their top values (has_more), such as Company
 * with its many client names, so a value past the top ones can still be found.
 * Columns whose own name matches the text keep every value, as in the panel, and
 * user columns are skipped since their whole list is already loaded.
 */
export function getServerSearchColumnKeys(
  columns: QuickFilterColumn[],
  values_by_column: Partial<Record<string, LinkBuildingOrderQuickFilterColumnValues>>,
  query: string
): string[] {
  const trimmed_query = query.trim().toLowerCase();
  if (!trimmed_query) return [];
  return columns
    .filter(
      (column) =>
        !isUserQuickFilterKey(column.key) &&
        values_by_column[column.key]?.has_more === true &&
        !column.label.toLowerCase().includes(trimmed_query)
    )
    .map((column) => column.key);
}

/**
 * Next "Filter by values" picks of a column after clicking `value`: clicking a
 * picked value removes it, any other value is added. Several values of one
 * column match any of them, like monday.
 */
export function toggleQuickFilterValue(selected_values: string[], value: string): string[] {
  return selected_values.includes(value)
    ? selected_values.filter((picked) => picked !== value)
    : [...selected_values, value];
}
