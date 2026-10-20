"use client";

import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import type {
  LinkBuildingOrderFilterState,
  LinkBuildingOrderSavedFilter,
} from "@/types/admin/link-building-order";
import {
  listSavedFilters,
  createSavedFilter,
  updateSavedFilter,
  deleteSavedFilter,
} from "@/services/admin/link-building-saved-filters.service";
import { parseApiErrorMessage } from "@/services/admin/link-building-dashboard.service";
import { areFilterStatesEqual, countActiveFilters } from "@/lib/link-building-saved-filters";

interface SavedFiltersMenuProps {
  /** Snapshot of the table's current filters, sorting and hidden columns. */
  current_state: LinkBuildingOrderFilterState;
  /** False when the table shows its default view, so there is nothing worth saving. */
  has_active_filters: boolean;
  /** Saved filter the current view came from, owned by the table so it is saved with the view. */
  applied_filter_id: string | null;
  onAppliedFilterChange: (id: string | null) => void;
  onApply: (state: LinkBuildingOrderFilterState) => void;
  onNotify?: (message: string) => void;
}

const MAX_NAME_LENGTH = 100;

/**
 * "Saved Filters" toolbar menu for the Link Building Orders table. Lets an admin
 * store the current combination of filters under a name, re-apply it in one click,
 * keep it up to date, rename it, share it with the team, or delete it.
 */
export default function SavedFiltersMenu({
  current_state,
  has_active_filters,
  applied_filter_id,
  onAppliedFilterChange,
  onApply,
  onNotify,
}: SavedFiltersMenuProps) {
  const [is_open, setIsOpen] = useState(false);
  const [saved_filters, setSavedFilters] = useState<LinkBuildingOrderSavedFilter[]>([]);
  const [has_loaded, setHasLoaded] = useState(false);
  const [is_loading, setIsLoading] = useState(false);
  const [error_message, setErrorMessage] = useState<string | null>(null);

  const [new_name, setNewName] = useState("");
  const [new_is_shared, setNewIsShared] = useState(false);
  const [is_saving, setIsSaving] = useState(false);

  const [renaming_id, setRenamingId] = useState<string | null>(null);
  const [rename_value, setRenameValue] = useState("");
  const [confirm_delete_id, setConfirmDeleteId] = useState<string | null>(null);
  const [busy_filter_id, setBusyFilterId] = useState<string | null>(null);

  const container_ref = useRef<HTMLDivElement>(null);

  // ── Loading ───────────────────────────────────────────────────────────────

  const loadSavedFilters = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      setSavedFilters(await listSavedFilters());
      setHasLoaded(true);
    } catch (err) {
      setErrorMessage(parseApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // A view restored with a saved filter applied needs the list to show that filter's name.
  useEffect(() => {
    if (!applied_filter_id || has_loaded) return;
    let is_cancelled = false;
    listSavedFilters()
      .then((list) => {
        if (is_cancelled) return;
        setSavedFilters(list);
        setHasLoaded(true);
      })
      .catch(() => {/* non-critical, the list loads again when the menu is opened */ });
    return () => {
      is_cancelled = true;
    };
  }, [applied_filter_id, has_loaded]);

  // The applied filter was deleted or unshared since the view was saved.
  useEffect(() => {
    if (has_loaded && applied_filter_id && !saved_filters.some((f) => f.id === applied_filter_id)) {
      onAppliedFilterChange(null);
    }
  }, [has_loaded, applied_filter_id, saved_filters, onAppliedFilterChange]);

  // ── Open / close ──────────────────────────────────────────────────────────

  // Loaded lazily on first open so the table does not pay for it on every visit.
  const openMenu = useCallback(() => {
    setIsOpen(true);
    if (!has_loaded && !is_loading) loadSavedFilters();
  }, [has_loaded, is_loading, loadSavedFilters]);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setRenamingId(null);
    setConfirmDeleteId(null);
    setErrorMessage(null);
  }, []);

  useEffect(() => {
    if (!is_open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (container_ref.current && !container_ref.current.contains(e.target as Node)) {
        closeMenu();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [is_open, closeMenu]);

  // ── Derived state ─────────────────────────────────────────────────────────

  const applied_filter = useMemo(
    () => saved_filters.find((f) => f.id === applied_filter_id) ?? null,
    [saved_filters, applied_filter_id]
  );

  const applied_is_modified = useMemo(
    () => applied_filter !== null && !areFilterStatesEqual(applied_filter.filters, current_state),
    [applied_filter, current_state]
  );

  const own_filters = saved_filters.filter((f) => f.is_owner);
  const shared_filters = saved_filters.filter((f) => !f.is_owner);

  const replaceInList = useCallback((updated: LinkBuildingOrderSavedFilter) => {
    setSavedFilters((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleApply = useCallback(
    (saved_filter: LinkBuildingOrderSavedFilter) => {
      onApply(saved_filter.filters);
      onAppliedFilterChange(saved_filter.id);
      closeMenu();
      onNotify?.(`Applied the "${saved_filter.name}" saved filter.`);
    },
    [onApply, onAppliedFilterChange, onNotify, closeMenu]
  );

  const handleSaveNew = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const name = new_name.trim();
      if (!name || is_saving) return;

      setIsSaving(true);
      setErrorMessage(null);
      try {
        const created = await createSavedFilter({
          name,
          filters: current_state,
          is_shared: new_is_shared,
        });
        setSavedFilters((prev) => [created, ...prev]);
        onAppliedFilterChange(created.id);
        setNewName("");
        setNewIsShared(false);
        onNotify?.(`Saved the current filters as "${created.name}".`);
      } catch (err) {
        setErrorMessage(parseApiErrorMessage(err));
      } finally {
        setIsSaving(false);
      }
    },
    [new_name, new_is_shared, is_saving, current_state, onAppliedFilterChange, onNotify]
  );

  const handleOverwrite = useCallback(
    async (saved_filter: LinkBuildingOrderSavedFilter) => {
      setBusyFilterId(saved_filter.id);
      setErrorMessage(null);
      try {
        const updated = await updateSavedFilter(saved_filter.id, { filters: current_state });
        replaceInList(updated);
        onAppliedFilterChange(updated.id);
        onNotify?.(`Updated "${updated.name}" with the current filters.`);
      } catch (err) {
        setErrorMessage(parseApiErrorMessage(err));
      } finally {
        setBusyFilterId(null);
      }
    },
    [current_state, replaceInList, onAppliedFilterChange, onNotify]
  );

  const handleToggleShare = useCallback(
    async (saved_filter: LinkBuildingOrderSavedFilter) => {
      setBusyFilterId(saved_filter.id);
      setErrorMessage(null);
      try {
        replaceInList(await updateSavedFilter(saved_filter.id, { is_shared: !saved_filter.is_shared }));
      } catch (err) {
        setErrorMessage(parseApiErrorMessage(err));
      } finally {
        setBusyFilterId(null);
      }
    },
    [replaceInList]
  );

  const startRename = useCallback((saved_filter: LinkBuildingOrderSavedFilter) => {
    setConfirmDeleteId(null);
    setRenamingId(saved_filter.id);
    setRenameValue(saved_filter.name);
  }, []);

  const handleRename = useCallback(
    async (saved_filter: LinkBuildingOrderSavedFilter) => {
      const name = rename_value.trim();
      if (!name || name === saved_filter.name) {
        setRenamingId(null);
        return;
      }

      setBusyFilterId(saved_filter.id);
      setErrorMessage(null);
      try {
        replaceInList(await updateSavedFilter(saved_filter.id, { name }));
        setRenamingId(null);
      } catch (err) {
        setErrorMessage(parseApiErrorMessage(err));
      } finally {
        setBusyFilterId(null);
      }
    },
    [rename_value, replaceInList]
  );

  const handleDelete = useCallback(
    async (saved_filter: LinkBuildingOrderSavedFilter) => {
      setBusyFilterId(saved_filter.id);
      setErrorMessage(null);
      try {
        await deleteSavedFilter(saved_filter.id);
        setSavedFilters((prev) => prev.filter((f) => f.id !== saved_filter.id));
        if (applied_filter_id === saved_filter.id) onAppliedFilterChange(null);
        setConfirmDeleteId(null);
        onNotify?.(`Deleted the "${saved_filter.name}" saved filter.`);
      } catch (err) {
        setErrorMessage(parseApiErrorMessage(err));
      } finally {
        setBusyFilterId(null);
      }
    },
    [applied_filter_id, onAppliedFilterChange, onNotify]
  );

  // ── Rendering ─────────────────────────────────────────────────────────────

  const renderFilterRow = (saved_filter: LinkBuildingOrderSavedFilter) => {
    const is_applied = saved_filter.id === applied_filter_id;
    const is_busy = busy_filter_id === saved_filter.id;
    const filter_count = countActiveFilters(saved_filter.filters);

    if (renaming_id === saved_filter.id) {
      return (
        <li key={saved_filter.id} className="px-3 py-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleRename(saved_filter);
            }}
            className="flex items-center gap-1.5"
          >
            <input
              autoFocus
              type="text"
              value={rename_value}
              maxLength={MAX_NAME_LENGTH}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.stopPropagation();
                  setRenamingId(null);
                }
              }}
              aria-label="Saved filter name"
              className="h-7 min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-2 text-xs outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
            />
            <button
              type="submit"
              disabled={is_busy || rename_value.trim() === ""}
              className="h-7 rounded-md bg-brand-500 px-2.5 text-[11px] font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setRenamingId(null)}
              className="h-7 rounded-md px-2 text-[11px] font-medium text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
          </form>
        </li>
      );
    }

    if (confirm_delete_id === saved_filter.id) {
      return (
        <li
          key={saved_filter.id}
          className="flex items-center justify-between gap-2 bg-red-50 px-3 py-2 dark:bg-red-900/20"
        >
          <p className="min-w-0 truncate text-xs text-red-700 dark:text-red-300">
            Delete &ldquo;{saved_filter.name}&rdquo;?
          </p>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => handleDelete(saved_filter)}
              disabled={is_busy}
              className="h-6 rounded-md bg-red-600 px-2 text-[11px] font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => setConfirmDeleteId(null)}
              className="h-6 rounded-md px-2 text-[11px] font-medium text-gray-600 hover:bg-white dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </li>
      );
    }

    return (
      <li
        key={saved_filter.id}
        className={`group flex items-center gap-1 px-1.5 ${is_applied ? "bg-brand-50/70 dark:bg-brand-900/20" : ""}`}
      >
        <button
          type="button"
          onClick={() => handleApply(saved_filter)}
          disabled={is_busy}
          title={`Apply "${saved_filter.name}"`}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-2 text-left transition-colors hover:bg-gray-50 disabled:opacity-60 dark:hover:bg-gray-700/50"
        >
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${is_applied ? "bg-brand-500" : "bg-transparent"}`}
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-xs font-medium text-gray-800 dark:text-gray-100">
                {saved_filter.name}
              </span>
              {saved_filter.is_owner && saved_filter.is_shared && (
                <span className="shrink-0 rounded-full bg-sky-100 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                  Shared
                </span>
              )}
            </span>
            <span className="block truncate text-[10px] text-gray-400 dark:text-gray-500">
              {filter_count === 0 ? "Sorting and columns only" : `${filter_count} filter${filter_count !== 1 ? "s" : ""}`}
              {!saved_filter.is_owner && saved_filter.owner_name ? `, by ${saved_filter.owner_name}` : ""}
            </span>
          </span>
        </button>

        <div className="flex shrink-0 items-center transition-opacity sm:opacity-0 sm:focus-within:opacity-100 sm:group-hover:opacity-100">
          {saved_filter.is_owner && (
            <>
              <IconButton
                label="Update with the current filters"
                onClick={() => handleOverwrite(saved_filter)}
                disabled={is_busy || !has_active_filters}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </IconButton>
              <IconButton label="Rename" onClick={() => startRename(saved_filter)} disabled={is_busy}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
              </IconButton>
              <IconButton
                label={saved_filter.is_shared ? "Stop sharing with the team" : "Share with the team"}
                onClick={() => handleToggleShare(saved_filter)}
                disabled={is_busy}
                is_active={saved_filter.is_shared}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </IconButton>
            </>
          )}
          {saved_filter.can_delete && (
            <IconButton
              label="Delete"
              onClick={() => {
                setRenamingId(null);
                setConfirmDeleteId(saved_filter.id);
              }}
              disabled={is_busy}
              tone="danger"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </IconButton>
          )}
        </div>
      </li>
    );
  };

  return (
    <div ref={container_ref} className="relative">
      <button
        type="button"
        onClick={() => (is_open ? closeMenu() : openMenu())}
        aria-haspopup="dialog"
        aria-expanded={is_open}
        title={
          applied_filter
            ? `Saved filter: ${applied_filter.name}${applied_is_modified ? " (modified)" : ""}`
            : "Save the current filters or apply a saved one"
        }
        className={`flex h-8 max-w-[14rem] items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors ${
          applied_filter
            ? "border-brand-300 bg-brand-50 text-brand-700 hover:bg-brand-100 dark:border-brand-700 dark:bg-brand-900/30 dark:text-brand-300 dark:hover:bg-brand-900/50"
            : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
        }`}
      >
        <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
        </svg>
        <span className="truncate">{applied_filter ? applied_filter.name : "Saved Filters"}</span>
        {applied_is_modified && (
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-label="Modified" />
        )}
        <svg className="h-3 w-3 shrink-0 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {is_open && (
        <div
          role="dialog"
          aria-label="Saved filters"
          className="absolute right-0 top-full z-50 mt-1.5 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl shadow-gray-200/60 dark:border-gray-700 dark:bg-gray-800 dark:shadow-black/30"
        >
          <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">Saved Filters</p>
            <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">
              Save your filters, sorting and hidden columns to reapply them in one click.
            </p>
          </div>

          {/* Applied filter has drifted from what was saved */}
          {applied_filter && applied_is_modified && applied_filter.is_owner && (
            <div className="flex items-center justify-between gap-2 border-b border-amber-100 bg-amber-50 px-4 py-2 dark:border-amber-900/30 dark:bg-amber-900/20">
              <p className="min-w-0 truncate text-[11px] text-amber-800 dark:text-amber-300">
                &ldquo;{applied_filter.name}&rdquo; has unsaved changes.
              </p>
              <button
                type="button"
                onClick={() => handleOverwrite(applied_filter)}
                disabled={busy_filter_id === applied_filter.id || !has_active_filters}
                className="h-6 shrink-0 rounded-md bg-amber-600 px-2 text-[11px] font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                Update
              </button>
            </div>
          )}

          {/* Save current filters */}
          <form onSubmit={handleSaveNew} className="border-b border-gray-100 px-4 py-3 dark:border-gray-700">
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={new_name}
                maxLength={MAX_NAME_LENGTH}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={has_active_filters ? "Name the current filters..." : "Apply a filter to save it"}
                disabled={!has_active_filters || is_saving}
                aria-label="New saved filter name"
                className="h-8 min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-xs outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              />
              <button
                type="submit"
                disabled={!has_active_filters || is_saving || new_name.trim() === ""}
                className="h-8 shrink-0 rounded-lg bg-brand-500 px-3 text-xs font-medium text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {is_saving ? "Saving..." : "Save"}
              </button>
            </div>
            <label className="mt-2 flex w-fit cursor-pointer items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
              <input
                type="checkbox"
                checked={new_is_shared}
                onChange={(e) => setNewIsShared(e.target.checked)}
                disabled={!has_active_filters || is_saving}
                className="h-3.5 w-3.5 rounded border-gray-300 text-brand-500 focus:ring-brand-400"
              />
              Share with the team
            </label>
          </form>

          {error_message && (
            <div className="flex items-start justify-between gap-2 border-b border-red-100 bg-red-50 px-4 py-2 dark:border-red-900/30 dark:bg-red-900/20">
              <p className="text-[11px] text-red-600 dark:text-red-400">{error_message}</p>
              {!has_loaded && (
                <button
                  type="button"
                  onClick={loadSavedFilters}
                  className="shrink-0 text-[11px] font-medium text-red-700 underline dark:text-red-300"
                >
                  Retry
                </button>
              )}
            </div>
          )}

          <div className="max-h-80 overflow-y-auto py-1">
            {is_loading && !has_loaded ? (
              <div className="space-y-2 px-4 py-3" aria-label="Loading saved filters">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-7 animate-pulse rounded-md bg-gray-100 dark:bg-gray-700" />
                ))}
              </div>
            ) : has_loaded && saved_filters.length === 0 ? (
              <p className="px-4 py-6 text-center text-[11px] text-gray-400 dark:text-gray-500">
                No saved filters yet. Set up the filters you need, then save them above.
              </p>
            ) : (
              <>
                {own_filters.length > 0 && (
                  <section>
                    <p className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      My filters
                    </p>
                    <ul>{own_filters.map(renderFilterRow)}</ul>
                  </section>
                )}
                {shared_filters.length > 0 && (
                  <section>
                    <p className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      Shared by the team
                    </p>
                    <ul>{shared_filters.map(renderFilterRow)}</ul>
                  </section>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Icon button ────────────────────────────────────────────────────────────────

function IconButton({
  label,
  onClick,
  disabled,
  is_active = false,
  tone = "default",
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  is_active?: boolean;
  tone?: "default" | "danger";
  children: React.ReactNode;
}) {
  const tone_classes =
    tone === "danger"
      ? "text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
      : is_active
        ? "text-sky-600 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-900/30"
        : "text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`rounded-md p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${tone_classes}`}
    >
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        {children}
      </svg>
    </button>
  );
}
