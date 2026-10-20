import React, { useState } from "react";
import type { ClientUserOption } from "@/services/admin/link-building-dashboard.service";
import ClientSearchableSelect from "./ClientSearchableSelect";
import FindHighlightedText from "./FindHighlightedText";
import type { TableFindMatchState } from "@/hooks/useTableFind";
import styles from "./LinkBuildingOrdersTable.module.scss";

export interface ClientAssignCellProps {
  user_id: number | null | undefined;
  client_users: ClientUserOption[];
  is_editing: boolean;
  onStartEdit: () => void;
  onAssignClient: (value: string) => void;
  onCancelEdit: () => void;
  /** True when this is the spreadsheet's active (keyboard selected) cell. */
  is_active?: boolean;
  /** True when this cell falls within the active multi-cell range selection. */
  is_range_selected?: boolean;
  /** Mouse down on the cell, makes it the active cell (or extends the range with
   *  Shift) without opening the picker, and starts a drag selection. */
  onSelectCell?: (shift_key: boolean) => void;
  /** Mouse enter while a drag is in progress, extends the range to this cell. */
  onCellMouseEnter?: () => void;
  onCellMouseUp?: () => void;
  /** Lookup key the table uses to scroll this cell into view during keyboard navigation. */
  cell_key?: string;
  /** Find (Ctrl/Cmd+F) highlight for this cell, null when it does not match. */
  find_match_state?: TableFindMatchState;
  /** Normalized find terms, only passed while this cell matches. */
  find_terms?: string[];
}

export default function ClientAssignCell({
  user_id,
  client_users,
  is_editing,
  onStartEdit,
  onAssignClient,
  onCancelEdit,
  is_active = false,
  is_range_selected = false,
  onSelectCell,
  onCellMouseEnter,
  onCellMouseUp,
  cell_key,
  find_match_state = null,
  find_terms,
}: ClientAssignCellProps) {
  // Kept in state (through a callback ref) rather than read from a ref during render,
  // so the dropdown re-renders with its anchor as soon as the cell mounts.
  const [cell_el, setCellEl] = useState<HTMLTableCellElement | null>(null);
  const selected_client = client_users.find(
    (u) => user_id != null && u.id === Number(user_id)
  );

  return (
    <>
      <td
        ref={setCellEl}
        data-cell-key={cell_key}
        className={`${styles.cell} select-none whitespace-nowrap text-xs transition-colors ${
          is_editing
            ? "bg-teal-50 ring-2 ring-inset ring-teal-400 dark:bg-teal-900/20 dark:ring-teal-600"
            : is_active
              ? styles.cell_active
              : ""
        }${is_range_selected && !is_editing ? ` ${styles.cell_in_range}` : ""}${
          find_match_state === "current"
            ? ` ${styles.cell_find_current}`
            : find_match_state === "match"
              ? ` ${styles.cell_find_match}`
              : ""
        }`}
        onMouseDown={!is_editing ? (e) => onSelectCell?.(e.shiftKey) : undefined}
        onMouseEnter={onCellMouseEnter}
        onMouseUp={onCellMouseUp}
        onDoubleClick={!is_editing ? onStartEdit : undefined}
        title="Double click or press Enter to assign a client account"
      >
        {selected_client ? (
          <span
            className="flex min-w-0 items-center gap-1.5"
            title={selected_client.company ? `${selected_client.company} (${selected_client.name})` : selected_client.name}
          >
            {selected_client.avatar_url ? (
              <img
                src={selected_client.avatar_url}
                alt={selected_client.name}
                className="h-5 w-5 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-600 text-[10px] font-bold text-white">
                {(selected_client.company || selected_client.name).charAt(0).toUpperCase()}
              </span>
            )}
            <span className="min-w-0 truncate font-medium text-gray-700 dark:text-gray-200">
              <FindHighlightedText
                text={selected_client.company || selected_client.name}
                find_terms={find_terms}
              />
            </span>
            {selected_client.company && (
              <span className="min-w-0 truncate text-[10px] text-gray-400 dark:text-gray-500">
                <FindHighlightedText text={selected_client.name} find_terms={find_terms} />
              </span>
            )}
          </span>
        ) : (
          <span className="text-gray-300 dark:text-gray-600">— Unassigned —</span>
        )}
      </td>
      {is_editing && (
        <ClientSearchableSelect
          client_users={client_users}
          selected_user_id={user_id}
          anchor_el={cell_el}
          onSelect={onAssignClient}
          onClose={onCancelEdit}
        />
      )}
    </>
  );
}
