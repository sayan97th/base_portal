"use client";

import ConfirmDeleteDialog from "./ConfirmDeleteDialog";

export interface DeleteAppointmentDialogProps {
  is_open: boolean;
  /** Human readable appointment type, for example "SME appointment". */
  appointment_type: string;
  appointment_id: number | string;
  client_name?: string | null;
  status_label?: string | null;
  scheduled_at?: string | null;
  is_loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
      />
    </svg>
  );
}

export function formatAppointmentDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Delete confirmation shared by every admin appointment detail view.
 * Built on top of ConfirmDeleteDialog so it always keeps the same look.
 */
export default function DeleteAppointmentDialog({
  is_open,
  appointment_type,
  appointment_id,
  client_name,
  status_label,
  scheduled_at,
  is_loading = false,
  onConfirm,
  onClose,
}: DeleteAppointmentDialogProps) {
  const formatted_date = formatAppointmentDate(scheduled_at);
  const meta_parts = [status_label, formatted_date ?? "Not scheduled yet"].filter(Boolean);
  const item_name = client_name?.trim()
    ? `#${appointment_id} · ${client_name.trim()}`
    : `#${appointment_id}`;

  return (
    <ConfirmDeleteDialog
      is_open={is_open}
      title="Delete appointment"
      description="The appointment record and its notes will be permanently removed from the portal."
      item_label={appointment_type}
      item_name={item_name}
      item_meta={meta_parts.join(" · ")}
      item_icon={<CalendarIcon />}
      consequences={[
        "This does not cancel the meeting in Calendly. Cancel it there first if needed.",
      ]}
      confirm_label="Delete appointment"
      is_loading={is_loading}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
}
