import type { LinkBuildingOrderQuickFilterColumnValues } from "@/types/admin/link-building-order";

/**
 * Helpers for the Link Building Orders "Quick filters" panel, the monday style
 * grid of columns whose values are picked with one click. Picks on a regular
 * column are stored as that column's "Filter by values" selection, so they are
 * saved, restored and listed as chips like any other column filter. Picks on
 * "Assigned To" use the Assigned To filter.
 */

/** Key of the Assigned To column in the quick filter values API. */
export const ASSIGNED_USER_QUICK_FILTER_KEY = "assigned_admin_user_id";

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
  /** Shown instead of a dot on the Assigned To column. */
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

function buildAssignedUserOptions(
  column_values: LinkBuildingOrderQuickFilterColumnValues | undefined,
  selected_values: string[],
  users: QuickFilterUser[],
  current_user_id: number | null
): QuickFilterOption[] {
  const counts = new Map((column_values?.values ?? []).map((item) => [item.value, item.count]));
  const users_by_id = new Map(users.map((user) => [String(user.id), user]));
  const ids = Array.from(new Set([...counts.keys(), ...selected_values])).filter((id) => id !== "" && id !== "0");

  const user_options = ids
    .map((id): QuickFilterOption => {
      const user = users_by_id.get(id);
      const name = user?.name ?? `User #${id}`;
      return {
        value: id,
        label: String(current_user_id) === id ? "Me" : name,
        count: counts.get(id) ?? 0,
        avatar: { name, url: user?.avatar_url ?? null },
      };
    })
    // "Me" first, then by name, like monday's Owner column.
    .sort((a, b) => Number(b.label === "Me") - Number(a.label === "Me") || a.label.localeCompare(b.label));

  const unassigned_count = counts.get("") ?? 0;
  if (unassigned_count > 0 || selected_values.includes("0")) {
    user_options.push({ value: "0", label: "Unassigned", count: unassigned_count, avatar: { name: "", url: null } });
  }
  return user_options;
}

/** Builds every facet of the Quick filters panel from the API response and the current picks. */
export function buildQuickFilterFacets({
  columns,
  values_by_column,
  selections,
  users,
  current_user_id,
}: {
  columns: QuickFilterColumn[];
  values_by_column: Partial<Record<string, LinkBuildingOrderQuickFilterColumnValues>>;
  selections: Partial<Record<string, string[]>>;
  users: QuickFilterUser[];
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
      options:
        column.key === ASSIGNED_USER_QUICK_FILTER_KEY
          ? buildAssignedUserOptions(column_values, selected_values, users, current_user_id)
          : buildValueOptions(column, column_values, selected_values),
    };
  });
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
