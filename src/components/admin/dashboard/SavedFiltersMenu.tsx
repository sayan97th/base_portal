"use client";

import React, { useState, useCallback, useEffect, useId, useMemo, useRef } from "react";
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
import styles from "./SavedFiltersMenu.module.scss";

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
  const new_name_input_id = useId();

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

  const current_summary = summarizeFilterState(current_state);

  const renderFilterRow = (saved_filter: LinkBuildingOrderSavedFilter) => {
    const is_applied = saved_filter.id === applied_filter_id;
    const is_busy = busy_filter_id === saved_filter.id;
    const summary = summarizeFilterState(saved_filter.filters);

    if (renaming_id === saved_filter.id) {
      return (
        <li key={saved_filter.id}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleRename(saved_filter);
            }}
            className={styles.item_inline}
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
              className={styles.input}
            />
            <button
              type="submit"
              disabled={is_busy || rename_value.trim() === ""}
              className={`${styles.small_button} ${styles.small_button_primary}`}
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setRenamingId(null)}
              className={`${styles.small_button} ${styles.small_button_ghost}`}
            >
              Cancel
            </button>
          </form>
        </li>
      );
    }

    if (confirm_delete_id === saved_filter.id) {
      return (
        <li key={saved_filter.id} className={`${styles.item_inline} ${styles.item_confirm}`}>
          <p className={styles.confirm_text}>
            Delete <strong>&ldquo;{saved_filter.name}&rdquo;</strong>?
          </p>
          <button
            type="button"
            onClick={() => handleDelete(saved_filter)}
            disabled={is_busy}
            className={`${styles.small_button} ${styles.small_button_danger}`}
          >
            {is_busy ? "Deleting..." : "Delete"}
          </button>
          <button
            type="button"
            onClick={() => setConfirmDeleteId(null)}
            className={`${styles.small_button} ${styles.small_button_ghost}`}
          >
            Cancel
          </button>
        </li>
      );
    }

    return (
      <li key={saved_filter.id} className={`${styles.item}${is_applied ? ` ${styles.is_applied}` : ""}`}>
        <button
          type="button"
          onClick={() => handleApply(saved_filter)}
          disabled={is_busy}
          title={`Apply "${saved_filter.name}"`}
          aria-current={is_applied ? "true" : undefined}
          className={styles.item_main}
        >
          <span
            className={`${styles.item_avatar}${saved_filter.is_owner ? "" : ` ${styles.is_team}`}`}
            aria-hidden="true"
          >
            {is_applied ? (
              <Icon path={ICON_PATHS.check} />
            ) : saved_filter.is_owner ? (
              <Icon path={ICON_PATHS.bookmark} />
            ) : (
              getInitials(saved_filter.owner_name)
            )}
          </span>
          <span className={styles.item_text}>
            <span className={styles.item_title_row}>
              <span className={styles.item_name}>{saved_filter.name}</span>
              {is_applied && applied_is_modified ? (
                <span className={`${styles.badge} ${styles.badge_modified}`}>Modified</span>
              ) : is_applied ? (
                <span className={`${styles.badge} ${styles.badge_applied}`}>Applied</span>
              ) : null}
              {saved_filter.is_owner && saved_filter.is_shared && (
                <span className={`${styles.badge} ${styles.badge_shared}`}>Shared</span>
              )}
            </span>
            <span className={styles.item_meta}>
              <SummaryTags summary={summary} />
              {!saved_filter.is_owner && saved_filter.owner_name && (
                <span className={styles.item_owner}>by {saved_filter.owner_name}</span>
              )}
            </span>
          </span>
        </button>

        <div className={styles.item_actions}>
          {saved_filter.is_owner && (
            <>
              <IconButton
                label="Update with the current filters"
                onClick={() => handleOverwrite(saved_filter)}
                disabled={is_busy || !has_active_filters}
                path={ICON_PATHS.refresh}
              />
              <IconButton
                label="Rename"
                onClick={() => startRename(saved_filter)}
                disabled={is_busy}
                path={ICON_PATHS.pencil}
              />
              <IconButton
                label={saved_filter.is_shared ? "Stop sharing with the team" : "Share with the team"}
                onClick={() => handleToggleShare(saved_filter)}
                disabled={is_busy}
                is_active={saved_filter.is_shared}
                path={ICON_PATHS.team}
              />
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
              path={ICON_PATHS.trash}
            />
          )}
        </div>
      </li>
    );
  };

  const renderGroup = (title: string, filters: LinkBuildingOrderSavedFilter[]) => (
    <section className={styles.group} aria-label={title}>
      <p className={styles.group_heading}>
        {title}
        <span className={styles.group_count}>{filters.length}</span>
      </p>
      <ul className={styles.list}>{filters.map(renderFilterRow)}</ul>
    </section>
  );

  const trigger_class = [
    styles.trigger,
    is_open ? styles.is_open : "",
    applied_filter ? styles.is_applied : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={container_ref} className={styles.root}>
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
        className={trigger_class}
      >
        <Icon path={ICON_PATHS.bookmark} className={styles.trigger_icon} stroke_width={2} />
        <span className={styles.trigger_label}>{applied_filter ? applied_filter.name : "Saved Filters"}</span>
        {applied_is_modified && <span className={styles.modified_dot} aria-label="Modified" />}
        <Icon path={ICON_PATHS.chevron_down} className={styles.trigger_chevron} stroke_width={2.5} />
      </button>

      {is_open && (
        <div role="dialog" aria-label="Saved filters" className={styles.panel}>
          <div className={styles.header}>
            <span className={styles.header_icon} aria-hidden="true">
              <Icon path={ICON_PATHS.bookmark} />
            </span>
            <div className={styles.header_text}>
              <p className={styles.header_title}>
                Saved Filters
                {has_loaded && saved_filters.length > 0 && (
                  <span className={styles.group_count}>{saved_filters.length}</span>
                )}
              </p>
              <p className={styles.header_description}>
                Save your filters, sorting and hidden columns, then reapply them in one click.
              </p>
            </div>
            <button type="button" onClick={closeMenu} aria-label="Close" className={styles.header_close}>
              <Icon path={ICON_PATHS.close} stroke_width={2} />
            </button>
          </div>

          {/* Applied filter has drifted from what was saved */}
          {applied_filter && applied_is_modified && applied_filter.is_owner && (
            <div className={`${styles.notice} ${styles.notice_warning}`} role="status">
              <Icon path={ICON_PATHS.warning} stroke_width={2} />
              <p className={styles.notice_text}>
                <strong>{applied_filter.name}</strong> has unsaved changes.
              </p>
              <button
                type="button"
                onClick={() => handleOverwrite(applied_filter)}
                disabled={busy_filter_id === applied_filter.id || !has_active_filters}
                className={styles.notice_button}
              >
                Update
              </button>
            </div>
          )}

          {error_message && (
            <div className={`${styles.notice} ${styles.notice_error}`} role="alert">
              <Icon path={ICON_PATHS.warning} stroke_width={2} />
              <p className={styles.notice_text}>{error_message}</p>
              {!has_loaded && (
                <button type="button" onClick={loadSavedFilters} className={styles.notice_button}>
                  Retry
                </button>
              )}
            </div>
          )}

          {/* Save current filters */}
          <form onSubmit={handleSaveNew} className={styles.save_section}>
            <label htmlFor={new_name_input_id} className={styles.section_label}>
              Save the current view
            </label>
            <div className={styles.save_row}>
              <div className={styles.input_wrap}>
                <Icon path={ICON_PATHS.tag} className={styles.input_icon} />
                <input
                  id={new_name_input_id}
                  type="text"
                  value={new_name}
                  maxLength={MAX_NAME_LENGTH}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={has_active_filters ? "e.g. Live orders this month" : "Apply a filter to save it"}
                  disabled={!has_active_filters || is_saving}
                  className={styles.input}
                />
              </div>
              <button
                type="submit"
                disabled={!has_active_filters || is_saving || new_name.trim() === ""}
                className={styles.primary_button}
              >
                {is_saving ? (
                  <>
                    <Icon path={ICON_PATHS.spinner} className={styles.spinner} stroke_width={2} />
                    Saving
                  </>
                ) : (
                  "Save"
                )}
              </button>
            </div>

            {has_active_filters ? (
              <div className={styles.summary} aria-label="What will be saved">
                <SummaryTags summary={current_summary} />
              </div>
            ) : (
              <p className={styles.summary_hint}>
                Filter, sort or hide columns in the table, then come back to save the view.
              </p>
            )}

            <label
              className={`${styles.share_toggle}${!has_active_filters || is_saving ? ` ${styles.is_disabled}` : ""}`}
            >
              <input
                type="checkbox"
                checked={new_is_shared}
                onChange={(e) => setNewIsShared(e.target.checked)}
                disabled={!has_active_filters || is_saving}
                className={styles.share_input}
              />
              <span className={styles.share_switch} aria-hidden="true" />
              Share with the team
            </label>
          </form>

          <div className={styles.list_area}>
            {is_loading && !has_loaded ? (
              <div aria-label="Loading saved filters" aria-busy="true">
                {[0, 1, 2].map((i) => (
                  <div key={i} className={styles.skeleton_row}>
                    <span className={styles.skeleton_block} style={{ width: 34, height: 34, borderRadius: 9 }} />
                    <span style={{ flex: 1 }}>
                      <span className={styles.skeleton_block} style={{ display: "block", width: "55%", height: 12 }} />
                      <span
                        className={styles.skeleton_block}
                        style={{ display: "block", width: "35%", height: 10, marginTop: 8 }}
                      />
                    </span>
                  </div>
                ))}
              </div>
            ) : has_loaded && saved_filters.length === 0 ? (
              <div className={styles.empty}>
                <span className={styles.empty_icon} aria-hidden="true">
                  <Icon path={ICON_PATHS.bookmark} />
                </span>
                <p className={styles.empty_title}>No saved filters yet</p>
                <p className={styles.empty_text}>
                  Set up the filters you need, then give them a name above to reuse them later.
                </p>
              </div>
            ) : (
              <>
                {own_filters.length > 0 && renderGroup("My filters", own_filters)}
                {shared_filters.length > 0 && renderGroup("Shared by the team", shared_filters)}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

interface FilterStateSummary {
  filter_count: number;
  sort_count: number;
  hidden_count: number;
}

function summarizeFilterState(state: LinkBuildingOrderFilterState): FilterStateSummary {
  return {
    filter_count: countActiveFilters(state),
    sort_count: state.sort_rules.length,
    hidden_count: state.hidden_columns.length,
  };
}

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

/** Small tags describing what a saved view holds: filters, sort rules and hidden columns. */
function SummaryTags({ summary }: { summary: FilterStateSummary }) {
  const { filter_count, sort_count, hidden_count } = summary;
  return (
    <>
      {filter_count > 0 && (
        <span className={styles.tag}>
          <Icon path={ICON_PATHS.funnel} stroke_width={2} />
          {pluralize(filter_count, "filter")}
        </span>
      )}
      {sort_count > 0 && (
        <span className={styles.tag}>
          <Icon path={ICON_PATHS.sort} stroke_width={2} />
          {pluralize(sort_count, "sort")}
        </span>
      )}
      {hidden_count > 0 && (
        <span className={styles.tag}>
          <Icon path={ICON_PATHS.eye_slash} stroke_width={2} />
          {pluralize(hidden_count, "hidden column")}
        </span>
      )}
      {filter_count === 0 && sort_count === 0 && hidden_count === 0 && (
        <span className={styles.tag}>Default view</span>
      )}
    </>
  );
}

// ── Icons ──────────────────────────────────────────────────────────────────────

const ICON_PATHS = {
  bookmark:
    "M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z",
  chevron_down: "M19.5 8.25l-7.5 7.5-7.5-7.5",
  check: "M4.5 12.75l6 6 9-13.5",
  close: "M6 18L18 6M6 6l12 12",
  warning:
    "M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z",
  tag: "M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3zM6 6h.008v.008H6V6z",
  spinner: "M12 3a9 9 0 109 9",
  refresh:
    "M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99",
  pencil:
    "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z",
  team: "M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z",
  trash:
    "M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0",
  funnel:
    "M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z",
  sort: "M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5",
  eye_slash:
    "M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88",
} as const;

function Icon({
  path,
  className,
  stroke_width = 1.8,
}: {
  path: string;
  className?: string;
  stroke_width?: number;
}) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={stroke_width} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

// ── Icon button ────────────────────────────────────────────────────────────────

function IconButton({
  label,
  onClick,
  disabled,
  is_active = false,
  tone = "default",
  path,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  is_active?: boolean;
  tone?: "default" | "danger";
  path: string;
}) {
  const class_name = [
    styles.icon_button,
    is_active ? styles.is_active : "",
    tone === "danger" ? styles.is_danger : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type="button" onClick={onClick} disabled={disabled} title={label} aria-label={label} className={class_name}>
      <Icon path={path} />
    </button>
  );
}
