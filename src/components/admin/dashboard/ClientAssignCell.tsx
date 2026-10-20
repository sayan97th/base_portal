import React, { useRef } from "react";
import type { ClientUserOption } from "@/services/admin/link-building-dashboard.service";
import ClientSearchableSelect from "./ClientSearchableSelect";
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
  /** Mouse down on the cell, makes it the active cell without opening the picker. */
  onSelectCell?: () => void;
  /** Lookup key the table uses to scroll this cell into view during keyboard navigation. */
  cell_key?: string;
}

export default function ClientAssignCell({
  user_id,
  client_users,
  is_editing,
  onStartEdit,
  onAssignClient,
  onCancelEdit,
  is_active = false,
  onSelectCell,
  cell_key,
}: ClientAssignCellProps) {
  const cell_ref = useRef<HTMLTableCellElement>(null);
  const selected_client = client_users.find(
    (u) => user_id != null && u.id === Number(user_id)
  );

  return (
    <>
      <td
        ref={cell_ref}
        data-cell-key={cell_key}
        className={`${styles.cell} whitespace-nowrap text-xs transition-colors ${
          is_editing
            ? "bg-teal-50 ring-2 ring-inset ring-teal-400 dark:bg-teal-900/20 dark:ring-teal-600"
            : is_active
              ? styles.cell_active
              : ""
        }`}
        style={{ minWidth: 200 }}
        onMouseDown={!is_editing ? onSelectCell : undefined}
        onDoubleClick={!is_editing ? onStartEdit : undefined}
        title="Double click or press Enter to assign a client account"
      >
        {selected_client ? (
          <span className="inline-flex items-center gap-1.5">
            {selected_client.avatar_url ? (
              <img
                src={selected_client.avatar_url}
                alt={selected_client.name}
                className="h-5 w-5 rounded-full object-cover"
              />
            ) : (
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-teal-600 text-[10px] font-bold text-white">
                {(selected_client.company || selected_client.name).charAt(0).toUpperCase()}
              </span>
            )}
            <span className="font-medium text-gray-700 dark:text-gray-200">
              {selected_client.company || selected_client.name}
            </span>
            {selected_client.company && (
              <span className="text-[10px] text-gray-400 dark:text-gray-500">
                {selected_client.name}
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
          anchor_el={cell_ref.current}
          onSelect={onAssignClient}
          onClose={onCancelEdit}
        />
      )}
    </>
  );
}
