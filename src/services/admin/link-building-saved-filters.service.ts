import { apiClient } from "@/lib/api-client";
import { normalizeFilterState } from "@/lib/link-building-saved-filters";
import type {
  LinkBuildingOrderFilterPreference,
  LinkBuildingOrderFilterState,
  LinkBuildingOrderSavedFilter,
  LinkBuildingOrderSavedFilterPayload,
} from "@/types/admin/link-building-order";

const BASE_URL = "/api/admin/link-building-orders/saved-filters";
const PREFERENCE_URL = "/api/admin/link-building-orders/filter-preference";

/** Fills in defaults the API may omit (e.g. "" sent back as null) on every snapshot. */
function normalizeSavedFilter(saved_filter: LinkBuildingOrderSavedFilter): LinkBuildingOrderSavedFilter {
  return { ...saved_filter, filters: normalizeFilterState(saved_filter.filters) };
}

/**
 * GET /api/admin/link-building-orders/saved-filters
 * The current user's saved filters first, then the ones shared by other admins.
 */
export async function listSavedFilters(): Promise<LinkBuildingOrderSavedFilter[]> {
  const res = await apiClient.get<{ data: LinkBuildingOrderSavedFilter[] }>(BASE_URL);
  return res.data.map(normalizeSavedFilter);
}

/**
 * POST /api/admin/link-building-orders/saved-filters
 * Saves the given table state under a new name.
 */
export async function createSavedFilter(
  payload: Required<Pick<LinkBuildingOrderSavedFilterPayload, "name" | "filters">> &
    Pick<LinkBuildingOrderSavedFilterPayload, "is_shared">
): Promise<LinkBuildingOrderSavedFilter> {
  const res = await apiClient.post<{ message: string; data: LinkBuildingOrderSavedFilter }>(
    BASE_URL,
    payload
  );
  return normalizeSavedFilter(res.data);
}

/**
 * PUT /api/admin/link-building-orders/saved-filters/{id}
 * Renames, shares/unshares, or overwrites the snapshot of a filter the user owns.
 */
export async function updateSavedFilter(
  id: string,
  payload: LinkBuildingOrderSavedFilterPayload
): Promise<LinkBuildingOrderSavedFilter> {
  const res = await apiClient.put<{ message: string; data: LinkBuildingOrderSavedFilter }>(
    `${BASE_URL}/${id}`,
    payload
  );
  return normalizeSavedFilter(res.data);
}

/**
 * DELETE /api/admin/link-building-orders/saved-filters/{id}
 */
export async function deleteSavedFilter(id: string): Promise<void> {
  await apiClient.delete<{ message: string }>(`${BASE_URL}/${id}`);
}

// ── Auto saved view ───────────────────────────────────────────────────────────

function normalizePreference(preference: LinkBuildingOrderFilterPreference): LinkBuildingOrderFilterPreference {
  return {
    ...preference,
    filters: preference.filters ? normalizeFilterState(preference.filters) : null,
  };
}

/**
 * GET /api/admin/link-building-orders/filter-preference
 * The current user's last table view, `filters` is null when they never changed it.
 */
export async function getFilterPreference(): Promise<LinkBuildingOrderFilterPreference> {
  const res = await apiClient.get<{ data: LinkBuildingOrderFilterPreference }>(PREFERENCE_URL);
  return normalizePreference(res.data);
}

/**
 * PUT /api/admin/link-building-orders/filter-preference
 * Stores the current table view for the signed in user, called automatically on change.
 */
export async function saveFilterPreference(payload: {
  filters: LinkBuildingOrderFilterState;
  applied_saved_filter_id: string | null;
}): Promise<LinkBuildingOrderFilterPreference> {
  const res = await apiClient.put<{ message: string; data: LinkBuildingOrderFilterPreference }>(
    PREFERENCE_URL,
    payload
  );
  return normalizePreference(res.data);
}
