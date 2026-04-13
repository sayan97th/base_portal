"use client";

import type { CollaboratorPresence } from "@/types/admin/presence";

// ── Single editor badge (avatar + name + state label) ────────────────────────

interface EditorBadgeProps {
  editor: CollaboratorPresence;
}

/**
 * Colored pill showing a collaborator's avatar, first name, and current
 * activity state ("editing" when a specific cell is focused, "viewing" when
 * only the row is selected).
 */
function EditorBadge({ editor }: EditorBadgeProps) {
  const is_editing_cell = !!editor.focused_col_key;
  const first_name = editor.name.split(" ")[0];

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm"
      style={{ backgroundColor: editor.color }}
      title={
        is_editing_cell
          ? `${editor.name} is editing ${editor.focused_col_key}`
          : `${editor.name} has this row selected`
      }
    >
      {/* Mini avatar */}
      <span
        className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-white/25 text-[7px] font-bold leading-none"
      >
        {editor.initials}
      </span>

      {/* First name */}
      <span className="max-w-[64px] truncate">{first_name}</span>

      {/* Activity indicator */}
      <span className="opacity-75">
        {is_editing_cell ? (
          // Pencil icon
          <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
        ) : (
          // Eye icon
          <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
            <path
              fillRule="evenodd"
              d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </span>
    </span>
  );
}

// ── Row-level presence indicator ──────────────────────────────────────────────

interface RowPresenceIndicatorProps {
  /** All collaborators currently active on this row (editing a cell or row selected) */
  editors: CollaboratorPresence[];
}

/**
 * Renders a cluster of editor badges inside the row's actions cell.
 * Shows up to 2 full badges (avatar + name + state) then a compact +N overflow
 * badge for additional collaborators.
 *
 * Distinguishes two states per collaborator:
 *  • editing  — focused_col_key is set (actively editing a specific cell)
 *  • viewing  — focused_col_key is null (row is selected but no cell is being edited)
 */
export default function RowPresenceIndicator({
  editors,
}: RowPresenceIndicatorProps) {
  if (editors.length === 0) return null;

  const visible = editors.slice(0, 2);
  const overflow = editors.length - visible.length;

  return (
    <div
      className="flex items-center gap-0.5"
      title={buildTitle(editors)}
    >
      <div className="flex flex-col gap-0.5">
        {visible.map((c) => (
          <EditorBadge key={c.session_id} editor={c} />
        ))}
      </div>

      {overflow > 0 && (
        <span
          className="ml-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-gray-300 text-[9px] font-semibold text-gray-700 dark:bg-gray-600 dark:text-gray-200"
          title={editors
            .slice(2)
            .map((c) => c.name)
            .join(", ")}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}

function buildTitle(editors: CollaboratorPresence[]): string {
  const parts = editors.map((c) => {
    if (c.focused_col_key) return `${c.name} editing ${c.focused_col_key}`;
    return `${c.name} has this row selected`;
  });
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} · ${parts[1]}`;
  return `${parts.slice(0, -1).join(" · ")}, and ${parts[parts.length - 1]}`;
}

// ── Cell-level presence overlay ───────────────────────────────────────────────

interface CellPresenceOverlayProps {
  /** Collaborators editing THIS specific cell */
  editors: CollaboratorPresence[];
}

/**
 * Renders a tiny colored initials badge anchored to the top-right corner of a
 * table cell when another user is actively editing that exact cell.
 *
 * The parent <td> must have `position: relative` (added via className).
 */
export function CellPresenceOverlay({ editors }: CellPresenceOverlayProps) {
  if (editors.length === 0) return null;

  // Show only the first editor; multiple simultaneous cell editors is rare
  // (last-write-wins semantics apply on save).
  const primary = editors[0];

  return (
    <span
      className="pointer-events-none absolute -right-1.5 -top-1.5 z-10 flex h-4 w-4 items-center justify-center rounded-full border border-white text-[8px] font-bold text-white shadow dark:border-gray-900"
      style={{ backgroundColor: primary.color }}
      title={`${primary.name} is editing this cell`}
    >
      {primary.initials}
    </span>
  );
}

// ── Row presence floater (first-column overlay, Google-Sheets style) ──────────

interface RowPresenceFloaterProps {
  /** All collaborators currently active on this row */
  editors: CollaboratorPresence[];
}

/**
 * Google-Sheets-style floating user chips that appear above the first cell of
 * a row whenever one or more collaborators have it selected or are editing it.
 *
 * Each chip shows:
 *  • The user's avatar (photo when available, otherwise colored initials)
 *  • Their first name
 *  • A pulsing dot when they are actively editing a cell
 *  • A small downward caret that "points" at the row below
 *
 * Up to 3 users are shown as full chips; additional users are collapsed into a
 * compact "+N" overflow badge.
 *
 * The parent <td> must have `position: relative`.
 */
export function RowPresenceFloater({ editors }: RowPresenceFloaterProps) {
  if (editors.length === 0) return null;

  const visible = editors.slice(0, 3);
  const overflow_count = editors.length - visible.length;
  const overflow_names = editors
    .slice(3)
    .map((e) => e.name)
    .join(", ");

  return (
    <div className="pointer-events-none absolute bottom-full left-0 z-20 mb-0.5 flex items-end gap-1">
      {visible.map((editor) => {
        const is_editing = !!editor.focused_col_key;
        const first_name = editor.name.split(" ")[0];

        return (
          <div
            key={editor.session_id}
            className="flex flex-col items-center"
            title={
              is_editing
                ? `${editor.name} is editing "${editor.focused_col_key}"`
                : `${editor.name} has this row selected`
            }
          >
            {/* ── Chip ─────────────────────────────────────────────────────── */}
            <div
              className="flex items-center gap-1 rounded-full py-0.5 pl-0.5 pr-2 shadow-md ring-1 ring-white/30 dark:ring-black/30"
              style={{ backgroundColor: editor.color }}
            >
              {/* Avatar */}
              <div
                className="flex h-[18px] w-[18px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/25 text-[8px] font-bold leading-none text-white"
              >
                {editor.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={editor.avatar_url}
                    alt={editor.name}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  editor.initials
                )}
              </div>

              {/* First name */}
              <span className="max-w-[56px] truncate text-[10px] font-semibold leading-none text-white">
                {first_name}
              </span>

              {/* Editing pulse dot — shown only when a specific cell is being edited */}
              {is_editing ? (
                <span className="relative ml-0.5 flex h-1.5 w-1.5 shrink-0">
                  <span
                    className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"
                  />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                </span>
              ) : (
                /* Eye dot — shown when only the row is selected */
                <span className="ml-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white/50" />
              )}
            </div>

            {/* ── Downward caret "pointer" ──────────────────────────────────── */}
            <div
              className="h-[5px] w-[10px] shrink-0"
              style={{
                clipPath: "polygon(0 0, 100% 0, 50% 100%)",
                backgroundColor: editor.color,
              }}
            />
          </div>
        );
      })}

      {/* Overflow badge */}
      {overflow_count > 0 && (
        <div
          className="flex flex-col items-center"
          title={overflow_names}
        >
          <div className="flex items-center gap-1 rounded-full bg-gray-500 py-0.5 pl-1.5 pr-2 shadow-md ring-1 ring-white/20 dark:ring-black/20">
            <span className="text-[10px] font-semibold leading-none text-white">
              +{overflow_count}
            </span>
          </div>
          <div
            className="h-[5px] w-[10px] shrink-0"
            style={{
              clipPath: "polygon(0 0, 100% 0, 50% 100%)",
              backgroundColor: "#6b7280",
            }}
          />
        </div>
      )}
    </div>
  );
}
