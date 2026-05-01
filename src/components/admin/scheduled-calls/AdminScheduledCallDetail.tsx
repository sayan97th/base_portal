"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import flatpickr from "flatpickr";
import type { Instance } from "flatpickr/dist/types/instance";
import "flatpickr/dist/flatpickr.css";
import { adminScheduledCallService } from "@/services/admin/scheduled-call.service";
import type {
  AdminScheduledCallAppointment,
  AdminScheduledCallStatus,
  UpdateAdminScheduledCallPayload,
} from "@/services/admin/scheduled-call.service";

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  AdminScheduledCallStatus,
  { label: string; badge: string; dot: string; pill_active: string; pill_idle: string }
> = {
  pending: {
    label: "Pending",
    badge: "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400",
    dot: "bg-warning-500",
    pill_active: "border-warning-400 bg-warning-50 text-warning-700 dark:border-warning-500/50 dark:bg-warning-500/10 dark:text-warning-400",
    pill_idle: "border-gray-200 bg-white text-gray-600 hover:border-warning-300 hover:bg-warning-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400",
  },
  confirmed: {
    label: "Confirmed",
    badge: "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400",
    dot: "bg-success-500",
    pill_active: "border-success-400 bg-success-50 text-success-700 dark:border-success-500/50 dark:bg-success-500/10 dark:text-success-400",
    pill_idle: "border-gray-200 bg-white text-gray-600 hover:border-success-300 hover:bg-success-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400",
  },
  cancelled: {
    label: "Cancelled",
    badge: "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400",
    dot: "bg-error-500",
    pill_active: "border-error-400 bg-error-50 text-error-700 dark:border-error-500/50 dark:bg-error-500/10 dark:text-error-400",
    pill_idle: "border-gray-200 bg-white text-gray-600 hover:border-error-300 hover:bg-error-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400",
  },
  completed: {
    label: "Completed",
    badge: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
    dot: "bg-blue-500",
    pill_active: "border-blue-400 bg-blue-50 text-blue-700 dark:border-blue-500/50 dark:bg-blue-500/10 dark:text-blue-400",
    pill_idle: "border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400",
  },
  no_show: {
    label: "No Show",
    badge: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    dot: "bg-gray-400",
    pill_active: "border-gray-400 bg-gray-100 text-gray-700 dark:border-gray-500/50 dark:bg-gray-800 dark:text-gray-300",
    pill_idle: "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400",
  },
};

const STATUS_TRANSITIONS: Record<AdminScheduledCallStatus, AdminScheduledCallStatus[]> = {
  pending: ["confirmed", "cancelled", "no_show"],
  confirmed: ["completed", "cancelled", "no_show"],
  cancelled: [],
  completed: [],
  no_show: [],
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 py-3 last:border-0 dark:border-gray-800">
      <dt className="shrink-0 text-sm text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="text-right text-sm font-medium text-gray-900 dark:text-white">{value}</dd>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
      </div>
      <dl className="px-5">{children}</dl>
    </div>
  );
}

function SkeletonLoader() {
  return (
    <div className="space-y-6">
      <Link
        href="/admin/scheduled-calls"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back to Scheduled Calls
      </Link>
      <div className="flex items-center gap-3">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
        <div className="h-6 w-20 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="h-64 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
          <div className="h-40 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
        </div>
        <div className="space-y-4">
          <div className="h-48 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
          <div className="h-40 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
        </div>
      </div>
    </div>
  );
}

// ── DateTimePicker ─────────────────────────────────────────────────────────────

function DateTimePickerInput({
  value,
  on_change,
}: {
  value: string;
  on_change: (iso: string) => void;
}) {
  const input_ref = useRef<HTMLInputElement>(null);
  const fp_ref = useRef<Instance | null>(null);

  useEffect(() => {
    if (!input_ref.current) return;
    fp_ref.current = flatpickr(input_ref.current, {
      enableTime: true,
      dateFormat: "M j, Y h:i K",
      disableMobile: true,
      onChange: (dates) => {
        if (!dates.length) { on_change(""); return; }
        on_change(dates[0].toISOString());
      },
    }) as Instance;
    return () => { fp_ref.current?.destroy(); fp_ref.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!fp_ref.current) return;
    if (!value) { fp_ref.current.clear(); return; }
    const target = new Date(value);
    const current = fp_ref.current.selectedDates[0];
    if (!current || Math.abs(current.getTime() - target.getTime()) > 60000) {
      fp_ref.current.setDate(target, false);
    }
  }, [value]);

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    fp_ref.current?.clear();
    on_change("");
  }

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <input
        ref={input_ref}
        readOnly
        placeholder="Select date & time…"
        className="h-10 w-full cursor-pointer rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-8 text-sm text-gray-700 placeholder-gray-400 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:placeholder-gray-500 dark:focus:border-brand-400 dark:focus:bg-gray-900"
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute inset-y-0 right-2 flex items-center text-gray-400 transition hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ── Update modal ───────────────────────────────────────────────────────────────

interface UpdateModalProps {
  appointment: AdminScheduledCallAppointment;
  modal_status: AdminScheduledCallStatus | "";
  modal_scheduled_at: string;
  modal_admin_notes: string;
  is_saving: boolean;
  onStatusChange: (s: AdminScheduledCallStatus | "") => void;
  onScheduledAtChange: (v: string) => void;
  onAdminNotesChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

function AppointmentUpdateModal({
  appointment,
  modal_status,
  modal_scheduled_at,
  modal_admin_notes,
  is_saving,
  onStatusChange,
  onScheduledAtChange,
  onAdminNotesChange,
  onConfirm,
  onCancel,
}: UpdateModalProps) {
  const current_cfg = STATUS_CONFIG[appointment.status];
  const available_transitions = STATUS_TRANSITIONS[appointment.status];

  return (
    <div className="fixed inset-0 z-99999 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-5 dark:border-gray-800">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/10">
            <svg className="h-5 w-5 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Update Appointment
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Call #{appointment.id} &middot; currently{" "}
              <span className={`font-medium ${current_cfg.badge.split(" ")[1]}`}>
                {current_cfg.label}
              </span>
            </p>
          </div>
        </div>

        <div className="space-y-5 px-6 py-5">
          {/* Status section */}
          {available_transitions.length > 0 && (
            <div>
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Change Status
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onStatusChange("")}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-medium transition-all ${
                    modal_status === "" ? current_cfg.pill_active : current_cfg.pill_idle
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${current_cfg.dot}`} />
                  {current_cfg.label}
                </button>
                {available_transitions.map((s) => {
                  const cfg = STATUS_CONFIG[s];
                  const is_selected = modal_status === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => onStatusChange(s)}
                      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-medium transition-all ${
                        is_selected ? cfg.pill_active : cfg.pill_idle
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Scheduled At */}
          <div>
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Scheduled Date &amp; Time
            </p>
            <DateTimePickerInput value={modal_scheduled_at} on_change={onScheduledAtChange} />
            {!modal_scheduled_at && (
              <p className="mt-1.5 text-xs text-gray-400">Leave empty to keep the current date.</p>
            )}
          </div>

          {/* Admin notes */}
          <div>
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Admin Notes
            </p>
            <textarea
              value={modal_admin_notes}
              onChange={(e) => onAdminNotesChange(e.target.value)}
              rows={3}
              placeholder="Internal notes visible only to admins…"
              className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:placeholder-gray-500 dark:focus:border-brand-400 dark:focus:bg-gray-900"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4 dark:border-gray-800">
          <button
            type="button"
            onClick={onCancel}
            disabled={is_saving}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={is_saving}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-60 dark:bg-brand-600 dark:hover:bg-brand-500"
          >
            {is_saving && (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            {is_saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete confirmation modal ──────────────────────────────────────────────────

function DeleteConfirmModal({
  appointment_id,
  is_deleting,
  onConfirm,
  onCancel,
}: {
  appointment_id: number;
  is_deleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-99999 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-5 dark:border-gray-800">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-error-50 dark:bg-error-500/10">
            <svg className="h-5 w-5 text-error-600 dark:text-error-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Delete Appointment
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Call #{appointment_id} &middot; This action cannot be undone
            </p>
          </div>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to permanently delete this scheduled call record? All related data will be removed.
          </p>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4 dark:border-gray-800">
          <button
            type="button"
            onClick={onCancel}
            disabled={is_deleting}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={is_deleting}
            className="inline-flex items-center gap-2 rounded-xl bg-error-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-error-600 disabled:opacity-60"
          >
            {is_deleting && (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            {is_deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface AdminScheduledCallDetailProps {
  appointment_id: number;
}

export default function AdminScheduledCallDetail({ appointment_id }: AdminScheduledCallDetailProps) {
  const router = useRouter();
  const [appointment, setAppointment] = useState<AdminScheduledCallAppointment | null>(null);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [show_update_modal, setShowUpdateModal] = useState(false);
  const [show_delete_modal, setShowDeleteModal] = useState(false);
  const [is_saving, setIsSaving] = useState(false);
  const [is_deleting, setIsDeleting] = useState(false);
  const [save_error, setSaveError] = useState<string | null>(null);

  const [modal_status, setModalStatus] = useState<AdminScheduledCallStatus | "">("");
  const [modal_scheduled_at, setModalScheduledAt] = useState("");
  const [modal_admin_notes, setModalAdminNotes] = useState("");

  const fetchAppointment = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminScheduledCallService.fetchAppointmentById(appointment_id);
      setAppointment(data);
    } catch {
      setError("Failed to load this scheduled call. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [appointment_id]);

  useEffect(() => { fetchAppointment(); }, [fetchAppointment]);

  function openUpdateModal() {
    if (!appointment) return;
    setModalStatus("");
    setModalScheduledAt(appointment.scheduled_at ?? "");
    setModalAdminNotes(appointment.admin_notes ?? "");
    setSaveError(null);
    setShowUpdateModal(true);
  }

  async function handleSaveUpdate() {
    if (!appointment) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const payload: UpdateAdminScheduledCallPayload = {};
      if (modal_status) payload.status = modal_status;
      if (modal_scheduled_at) payload.scheduled_at = modal_scheduled_at;
      payload.admin_notes = modal_admin_notes;

      const updated = await adminScheduledCallService.updateAppointment(appointment_id, payload);
      setAppointment(updated);
      setShowUpdateModal(false);
    } catch {
      setSaveError("Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await adminScheduledCallService.deleteAppointment(appointment_id);
      router.push("/admin/scheduled-calls");
    } catch {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  }

  if (is_loading) return <SkeletonLoader />;

  if (error || !appointment) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/scheduled-calls"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to Scheduled Calls
        </Link>
        <div className="flex items-center gap-3 rounded-xl bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          {error ?? "Appointment not found."}
          <button onClick={fetchAppointment} className="ml-auto underline underline-offset-2 hover:no-underline">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const status_cfg = STATUS_CONFIG[appointment.status];
  const can_edit = STATUS_TRANSITIONS[appointment.status].length > 0 ||
    appointment.status === "pending" ||
    appointment.status === "confirmed";

  function formatDateTime(iso: string) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }) + " at " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  }

  return (
    <>
      <div className="space-y-6">
        {/* Back + title row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <Link
              href="/admin/scheduled-calls"
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              Back to Scheduled Calls
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Call #{appointment.id}
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${status_cfg.badge}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${status_cfg.dot}`} />
                {status_cfg.label}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={openUpdateModal}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-brand-700 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
              </svg>
              Edit
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-error-200 bg-error-50 px-4 py-2 text-sm font-medium text-error-600 transition-colors hover:border-error-300 hover:bg-error-100 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400 dark:hover:bg-error-500/20"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
              Delete
            </button>
          </div>
        </div>

        {/* Save error banner */}
        {save_error && (
          <div className="flex items-center gap-3 rounded-xl bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            {save_error}
          </div>
        )}

        {/* Content grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left column */}
          <div className="space-y-6 lg:col-span-2">
            {/* Appointment details */}
            <SectionCard title="Appointment Details">
              <InfoRow
                label="Scheduled Date"
                value={appointment.scheduled_at ? formatDateTime(appointment.scheduled_at) : <span className="text-gray-400">—</span>}
              />
              <InfoRow
                label="Created On"
                value={formatDate(appointment.created_at)}
              />
              {appointment.updated_at && (
                <InfoRow
                  label="Last Updated"
                  value={formatDate(appointment.updated_at)}
                />
              )}
              <InfoRow
                label="Status"
                value={
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${status_cfg.badge}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${status_cfg.dot}`} />
                    {status_cfg.label}
                  </span>
                }
              />
              {appointment.event_uri && (
                <InfoRow
                  label="Event URI"
                  value={
                    <span className="break-all font-mono text-xs text-gray-500 dark:text-gray-400">
                      {appointment.event_uri}
                    </span>
                  }
                />
              )}
              {appointment.invitee_uri && (
                <InfoRow
                  label="Invitee URI"
                  value={
                    <span className="break-all font-mono text-xs text-gray-500 dark:text-gray-400">
                      {appointment.invitee_uri}
                    </span>
                  }
                />
              )}
            </SectionCard>

            {/* Notes */}
            {(appointment.notes || appointment.cancellation_reason || appointment.reschedule_reason) && (
              <SectionCard title="Notes & Reasons">
                {appointment.notes && (
                  <InfoRow
                    label="Client Notes"
                    value={<span className="whitespace-pre-wrap text-left">{appointment.notes}</span>}
                  />
                )}
                {appointment.cancellation_reason && (
                  <InfoRow
                    label="Cancellation Reason"
                    value={<span className="whitespace-pre-wrap text-left text-error-600 dark:text-error-400">{appointment.cancellation_reason}</span>}
                  />
                )}
                {appointment.reschedule_reason && (
                  <InfoRow
                    label="Reschedule Reason"
                    value={<span className="whitespace-pre-wrap text-left">{appointment.reschedule_reason}</span>}
                  />
                )}
              </SectionCard>
            )}

            {/* Admin notes */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Admin Notes</h2>
                {can_edit && (
                  <button
                    onClick={openUpdateModal}
                    className="text-xs text-brand-500 transition-colors hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                  >
                    Edit
                  </button>
                )}
              </div>
              <div className="px-5 py-4">
                {appointment.admin_notes ? (
                  <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                    {appointment.admin_notes}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500">No admin notes yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Client info */}
            <SectionCard title="Client">
              {appointment.user ? (
                <>
                  <InfoRow
                    label="Name"
                    value={`${appointment.user.first_name} ${appointment.user.last_name}`}
                  />
                  <InfoRow label="Email" value={appointment.user.email} />
                  {appointment.user.organization && (
                    <InfoRow label="Organization" value={appointment.user.organization} />
                  )}
                  <div className="py-3">
                    <Link
                      href={`/admin/users/${appointment.user.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-gray-700 dark:text-gray-400 dark:hover:border-brand-700 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
                    >
                      View Client Profile
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </Link>
                  </div>
                </>
              ) : (
                <div className="py-4">
                  <p className="text-sm text-gray-400 dark:text-gray-500">No client information available.</p>
                </div>
              )}
            </SectionCard>

            {/* Quick actions */}
            {can_edit && (
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Quick Actions</h2>
                </div>
                <div className="space-y-2 px-5 py-4">
                  {STATUS_TRANSITIONS[appointment.status].map((s) => {
                    const cfg = STATUS_CONFIG[s];
                    return (
                      <button
                        key={s}
                        onClick={() => {
                          setModalStatus(s);
                          setModalScheduledAt(appointment.scheduled_at ?? "");
                          setModalAdminNotes(appointment.admin_notes ?? "");
                          setSaveError(null);
                          setShowUpdateModal(true);
                        }}
                        className={`w-full inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all ${cfg.pill_idle}`}
                      >
                        <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                        Mark as {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {show_update_modal && appointment && (
        <AppointmentUpdateModal
          appointment={appointment}
          modal_status={modal_status}
          modal_scheduled_at={modal_scheduled_at}
          modal_admin_notes={modal_admin_notes}
          is_saving={is_saving}
          onStatusChange={setModalStatus}
          onScheduledAtChange={setModalScheduledAt}
          onAdminNotesChange={setModalAdminNotes}
          onConfirm={handleSaveUpdate}
          onCancel={() => setShowUpdateModal(false)}
        />
      )}

      {show_delete_modal && (
        <DeleteConfirmModal
          appointment_id={appointment_id}
          is_deleting={is_deleting}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </>
  );
}
