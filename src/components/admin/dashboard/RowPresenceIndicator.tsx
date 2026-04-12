"use client";

import React from "react";
import type { CollaboratorPresence } from "@/types/admin/presence";
import { CollaboratorAvatar } from "./CollaborationBar";

// ── Row-level presence indicator ──────────────────────────────────────────────

interface RowPresenceIndicatorProps {
  /** All collaborators currently editing any cell in this row */
  editors: CollaboratorPresence[];
}

/**
 * Compact cluster of avatar badges rendered inside the row's actions cell.
 * Shows up to 3 avatars, then a +N overflow badge.
 *
 * Used to indicate that another user is actively editing a cell in this row,
 * similar to the user cursor indicators in Google Sheets.
 */
export default function RowPresenceIndicator({
  editors,
}: RowPresenceIndicatorProps) {
  if (editors.length === 0) return null;

  const visible = editors.slice(0, 3);
  const overflow = editors.length - visible.length;

  return (
    <div className="flex items-center gap-0.5" title={buildTitle(editors)}>
      <div className="flex -space-x-1">
        {visible.map((c) => (
          <CollaboratorAvatar key={c.session_id} collaborator={c} size="sm" />
        ))}
      </div>
      {overflow > 0 && (
        <span className="ml-0.5 text-[9px] font-semibold text-gray-500 dark:text-gray-400">
          +{overflow}
        </span>
      )}
    </div>
  );
}

function buildTitle(editors: CollaboratorPresence[]): string {
  const names = editors.map((c) => {
    const col = c.focused_col_key ? ` (${c.focused_col_key})` : "";
    return `${c.name}${col}`;
  });

  if (names.length === 1) return `${names[0]} is editing this row`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are editing this row`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]} are editing this row`;
}

// ── Cell-level presence overlay ───────────────────────────────────────────────

interface CellPresenceOverlayProps {
  /** Collaborators editing THIS specific cell */
  editors: CollaboratorPresence[];
}

/**
 * Renders a tiny avatar badge anchored to the top-right corner of a table cell
 * when another user is actively editing that exact cell.
 *
 * The parent <td> must have `position: relative` (added via className).
 */
export function CellPresenceOverlay({ editors }: CellPresenceOverlayProps) {
  if (editors.length === 0) return null;

  // Show only the first editor's avatar — multiple users on the same cell
  // is unusual but possible (last-write-wins semantics apply).
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
