"use client";

import React from "react";
import type { CollaboratorPresence } from "@/types/admin/presence";
import { CollaboratorAvatar } from "./CollaborationBar";

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

// ── Row selection banner (first-column overlay) ───────────────────────────────

interface RowSelectionBannerProps {
  /** The primary collaborator who has this row active */
  editor: CollaboratorPresence;
}

/**
 * A thin colored label that appears anchored to the top-left of the first
 * visible cell in a row, showing who has that row selected or in edit.
 *
 * The parent <td> must have `position: relative`.
 */
export function RowSelectionBanner({ editor }: RowSelectionBannerProps) {
  const is_editing = !!editor.focused_col_key;

  return (
    <span
      className="pointer-events-none absolute -top-2.5 left-0 z-10 flex items-center gap-0.5 rounded-sm px-1 py-px text-[8px] font-bold leading-none text-white shadow"
      style={{ backgroundColor: editor.color }}
      title={
        is_editing
          ? `${editor.name} is editing this row`
          : `${editor.name} has this row selected`
      }
    >
      <CollaboratorAvatar collaborator={editor} size="sm" />
      <span>{editor.name.split(" ")[0]}</span>
    </span>
  );
}
