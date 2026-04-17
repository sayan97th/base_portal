"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import flatpickr from "flatpickr";
import type { Instance } from "flatpickr/dist/types/instance";
import "flatpickr/dist/flatpickr.css";
import { adminSmeAppointmentService } from "@/services/admin/sme-appointment.service";
import type {
  AdminAppointment,
  AppointmentStatus,
  UpdateAppointmentPayload,
} from "@/services/admin/sme-appointment.service";

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  AppointmentStatus,
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
};

const SERVICE_LABELS: Record<string, string> = {
  authored: "Authored Content",
  collaboration: "Collaboration",
  enhanced: "Enhanced Content",
};

const STATUS_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled"],
  cancelled: [],
  completed: [],
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
      <Link href="/admin/sme-appointments" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back to Appointments
      </Link>
      <div className="flex items-center gap-3">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
        <div className="h-6 w-20 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
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

// ── Appointment update modal ───────────────────────────────────────────────────

interface UpdateModalProps {
  appointment: AdminAppointment;
  modal_status: AppointmentStatus | "";
  modal_scheduled_at: string;
  modal_admin_notes: string;
  is_saving: boolean;
  onStatusChange: (s: AppointmentStatus | "") => void;
  onScheduledAtChange: (v: string) => void;
  onNotesChange: (v: string) => void;
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
  onNotesChange,
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
              Appointment #{appointment.id} &middot; currently{" "}
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
                {/* Current status as default option */}
                <button
                  type="button"
                  onClick={() => onStatusChange("")}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-medium transition-all ${
                    modal_status === ""
                      ? current_cfg.pill_active
                      : current_cfg.pill_idle
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

          {/* Scheduled At section */}
          <div>
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Scheduled Date &amp; Time
            </p>
            <DateTimePickerInput
              value={modal_scheduled_at}
              on_change={onScheduledAtChange}
            />
            {!modal_scheduled_at && (
              <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                Leave empty to keep the current value unchanged.
              </p>
            )}
          </div>

          {/* Admin notes */}
          <div>
            <label className="mb-2.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Admin Notes{" "}
              <span className="font-normal normal-case text-gray-400">(optional)</span>
            </label>
            <textarea
              value={modal_admin_notes}
              onChange={(e) => onNotesChange(e.target.value)}
              rows={3}
              placeholder="Add internal notes for this update…"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:bg-gray-800"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4 dark:border-gray-800">
          <button
            onClick={onCancel}
            disabled={is_saving}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={is_saving}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {is_saving && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete modal ───────────────────────────────────────────────────────────────

interface DeleteModalProps {
  is_deleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirmModal({ is_deleting, onConfirm, onCancel }: DeleteModalProps) {
  return (
    <div className="fixed inset-0 z-99999 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        <div className="p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error-50 dark:bg-error-500/10">
            <svg className="h-6 w-6 text-error-600 dark:text-error-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h3 className="mt-4 text-base font-semibold text-gray-900 dark:text-white">
            Delete appointment
          </h3>
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
            This will permanently delete this appointment and all associated data. This action cannot be undone.
          </p>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4 dark:border-gray-800">
          <button
            onClick={onCancel}
            disabled={is_deleting}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={is_deleting}
            className="inline-flex items-center gap-2 rounded-lg bg-error-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-error-700 disabled:opacity-50"
          >
            {is_deleting && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface AdminSmeAppointmentDetailProps {
  appointment_id: number;
}

export default function AdminSmeAppointmentDetail({ appointment_id }: AdminSmeAppointmentDetailProps) {
  const router = useRouter();
  const [appointment, setAppointment] = useState<AdminAppointment | null>(null);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [show_update_modal, setShowUpdateModal] = useState(false);
  const [modal_status, setModalStatus] = useState<AppointmentStatus | "">("");
  const [modal_scheduled_at, setModalScheduledAt] = useState("");
  const [modal_admin_notes, setModalAdminNotes] = useState("");
  const [is_saving, setIsSaving] = useState(false);
  const [update_success, setUpdateSuccess] = useState<string | null>(null);

  const [show_delete_modal, setShowDeleteModal] = useState(false);
  const [is_deleting, setIsDeleting] = useState(false);

  const fetchAppointment = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminSmeAppointmentService.fetchAppointmentById(appointment_id);
      setAppointment(data);
    } catch {
      setError("Failed to load appointment. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [appointment_id]);

  useEffect(() => {
    fetchAppointment();
  }, [fetchAppointment]);

  function openUpdateModal() {
    if (!appointment) return;
    setModalStatus("");
    setModalScheduledAt(appointment.scheduled_at ?? "");
    setModalAdminNotes("");
    setShowUpdateModal(true);
  }

  function closeUpdateModal() {
    setShowUpdateModal(false);
    setModalStatus("");
    setModalScheduledAt("");
    setModalAdminNotes("");
  }

  async function handleUpdateConfirm() {
    if (!appointment) return;
    setIsSaving(true);
    try {
      const payload: UpdateAppointmentPayload = {};
      if (modal_status) payload.status = modal_status;
      if (modal_scheduled_at) payload.scheduled_at = modal_scheduled_at;
      if (modal_admin_notes) payload.admin_notes = modal_admin_notes;

      const updated = await adminSmeAppointmentService.updateAppointment(appointment.id, payload);
      setAppointment(updated);

      const parts: string[] = [];
      if (modal_status) parts.push(`status → ${STATUS_CONFIG[modal_status].label}`);
      if (modal_scheduled_at) parts.push("scheduled date updated");
      setUpdateSuccess(parts.length ? parts.join(" · ") : "Appointment updated");
      setTimeout(() => setUpdateSuccess(null), 4000);
    } catch {
      setError("Failed to update appointment. Please try again.");
    } finally {
      setIsSaving(false);
      closeUpdateModal();
    }
  }

  async function handleDeleteConfirm() {
    if (!appointment) return;
    setIsDeleting(true);
    try {
      await adminSmeAppointmentService.deleteAppointment(appointment.id);
      router.push("/admin/sme-appointments");
    } catch {
      setError("Failed to delete appointment. Please try again.");
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  }

  if (is_loading) return <SkeletonLoader />;

  if (error && !appointment) {
    return (
      <div className="space-y-4">
        <Link href="/admin/sme-appointments" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to Appointments
        </Link>
        <div className="rounded-xl bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
          {error}
          <button onClick={fetchAppointment} className="ml-2 underline underline-offset-2 hover:no-underline">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!appointment) return null;

  const status_cfg = STATUS_CONFIG[appointment.status];
  const available_transitions = STATUS_TRANSITIONS[appointment.status];
  const tier_entries = Object.entries(appointment.selected_tiers);

  return (
    <>
      <div className="space-y-6">
        {/* Back nav */}
        <Link
          href="/admin/sme-appointments"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to Appointments
        </Link>

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Appointment #{appointment.id}
            </h1>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${status_cfg.badge}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${status_cfg.dot}`} />
              {status_cfg.label}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={openUpdateModal}
              className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-100 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/20"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
              Update Appointment
              {available_transitions.length > 0 && (
                <span className="rounded-full bg-brand-200 px-1.5 py-0.5 text-xs font-semibold text-brand-700 dark:bg-brand-500/30 dark:text-brand-300">
                  {available_transitions.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:border-error-200 hover:bg-error-50 hover:text-error-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-error-700/30 dark:hover:bg-error-500/10 dark:hover:text-error-400"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
              Delete
            </button>
          </div>
        </div>

        {/* Success banner */}
        {update_success && (
          <div className="flex items-center gap-3 rounded-xl bg-success-50 px-4 py-3 text-sm text-success-700 dark:bg-success-500/10 dark:text-success-400">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {update_success}
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="rounded-xl bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
            {error}
          </div>
        )}

        {/* Content grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left / main column */}
          <div className="space-y-6 lg:col-span-2">
            {/* Appointment details */}
            <SectionCard title="Appointment Details">
              <InfoRow
                label="Service Type"
                value={
                  <span className="capitalize">
                    {SERVICE_LABELS[appointment.service_type] ?? appointment.service_type}
                  </span>
                }
              />
              <InfoRow
                label="Scheduled At"
                value={
                  appointment.scheduled_at
                    ? new Date(appointment.scheduled_at).toLocaleString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : "—"
                }
              />
              <InfoRow
                label="Created At"
                value={new Date(appointment.created_at).toLocaleString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              />
              {appointment.updated_at && (
                <InfoRow
                  label="Last Updated"
                  value={new Date(appointment.updated_at).toLocaleString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                />
              )}
              <InfoRow
                label="Event URI"
                value={
                  appointment.event_uri ? (
                    <a
                      href={appointment.event_uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate font-mono text-xs text-brand-600 hover:underline dark:text-brand-400"
                    >
                      {appointment.event_uri}
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
              <InfoRow
                label="Invitee URI"
                value={
                  appointment.invitee_uri ? (
                    <a
                      href={appointment.invitee_uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate font-mono text-xs text-brand-600 hover:underline dark:text-brand-400"
                    >
                      {appointment.invitee_uri}
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
            </SectionCard>

            {/* Selected tiers */}
            {tier_entries.length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Selected Service Tiers
                  </h2>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {tier_entries.map(([tier_id, tier]) => (
                    <div key={tier_id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {tier.label}
                        </span>
                        {tier.description && (
                          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{tier.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span>${tier.price.toFixed(2)}</span>
                        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          Qty: {tier.quantity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {(appointment.notes || appointment.admin_notes) && (
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Notes</h2>
                </div>
                <div className="space-y-4 p-5">
                  {appointment.notes && (
                    <div>
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">
                        Client Notes
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{appointment.notes}</p>
                    </div>
                  )}
                  {appointment.admin_notes && (
                    <div>
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">
                        Admin Notes
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{appointment.admin_notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right / sidebar column */}
          <div className="space-y-4">
            {/* Client info */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Client</h2>
              </div>
              {appointment.user ? (
                <div className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
                      {appointment.user.first_name[0]}{appointment.user.last_name[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {appointment.user.first_name} {appointment.user.last_name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{appointment.user.email}</p>
                    </div>
                  </div>
                  {appointment.user.organization && (
                    <p className="mt-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                      </svg>
                      {appointment.user.organization}
                    </p>
                  )}
                </div>
              ) : (
                <div className="px-5 py-4 text-sm text-gray-400">No client data available.</div>
              )}
            </div>

            {/* Current status */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Current Status</h2>
              </div>
              <div className="p-5">
                <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                  appointment.status === "pending"
                    ? "border-warning-200 bg-warning-50 dark:border-warning-700/30 dark:bg-warning-500/10"
                    : appointment.status === "confirmed"
                    ? "border-success-200 bg-success-50 dark:border-success-700/30 dark:bg-success-500/10"
                    : appointment.status === "cancelled"
                    ? "border-error-200 bg-error-50 dark:border-error-700/30 dark:bg-error-500/10"
                    : "border-blue-200 bg-blue-50 dark:border-blue-700/30 dark:bg-blue-500/10"
                }`}>
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${status_cfg.dot}`} />
                  <div>
                    <p className={`text-sm font-semibold ${status_cfg.badge.split(" ")[1]}`}>
                      {status_cfg.label}
                    </p>
                    {available_transitions.length > 0 ? (
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        Can move to: {available_transitions.map((s) => STATUS_CONFIG[s].label).join(", ")}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        Final status — no further transitions
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Update modal */}
      {show_update_modal && (
        <AppointmentUpdateModal
          appointment={appointment}
          modal_status={modal_status}
          modal_scheduled_at={modal_scheduled_at}
          modal_admin_notes={modal_admin_notes}
          is_saving={is_saving}
          onStatusChange={setModalStatus}
          onScheduledAtChange={setModalScheduledAt}
          onNotesChange={setModalAdminNotes}
          onConfirm={handleUpdateConfirm}
          onCancel={closeUpdateModal}
        />
      )}

      {/* Delete modal */}
      {show_delete_modal && (
        <DeleteConfirmModal
          is_deleting={is_deleting}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </>
  );
}
