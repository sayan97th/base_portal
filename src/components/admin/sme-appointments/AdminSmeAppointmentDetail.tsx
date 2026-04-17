"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminSmeAppointmentService } from "@/services/admin/sme-appointment.service";
import type {
  AdminAppointment,
  AppointmentStatus,
  UpdateAppointmentStatusPayload,
} from "@/services/admin/sme-appointment.service";

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  AppointmentStatus,
  { label: string; badge: string; dot: string }
> = {
  pending: {
    label: "Pending",
    badge: "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400",
    dot: "bg-warning-500",
  },
  confirmed: {
    label: "Confirmed",
    badge: "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400",
    dot: "bg-success-500",
  },
  cancelled: {
    label: "Cancelled",
    badge: "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400",
    dot: "bg-error-500",
  },
  completed: {
    label: "Completed",
    badge: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
    dot: "bg-blue-500",
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

// ── Status update modal ────────────────────────────────────────────────────────

interface StatusModalProps {
  current_status: AppointmentStatus;
  target_status: AppointmentStatus;
  is_saving: boolean;
  admin_notes: string;
  onNotesChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

function StatusUpdateModal({
  current_status,
  target_status,
  is_saving,
  admin_notes,
  onNotesChange,
  onConfirm,
  onCancel,
}: StatusModalProps) {
  const target_cfg = STATUS_CONFIG[target_status];
  const is_cancelling = target_status === "cancelled";

  return (
    <div className="fixed inset-0 z-99999 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        <div className="p-6">
          <div className={`flex h-12 w-12 items-center justify-center rounded-full ${is_cancelling ? "bg-error-50 dark:bg-error-500/10" : "bg-success-50 dark:bg-success-500/10"}`}>
            {is_cancelling ? (
              <svg className="h-6 w-6 text-error-600 dark:text-error-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6 text-success-600 dark:text-success-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <h3 className="mt-4 text-base font-semibold text-gray-900 dark:text-white">
            Update status to{" "}
            <span className={`capitalize ${is_cancelling ? "text-error-600 dark:text-error-400" : "text-success-600 dark:text-success-400"}`}>
              {target_cfg.label}
            </span>
          </h3>
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
            This will change the appointment status from{" "}
            <span className="font-medium capitalize text-gray-700 dark:text-gray-300">
              {STATUS_CONFIG[current_status].label}
            </span>{" "}
            to{" "}
            <span className="font-medium capitalize text-gray-700 dark:text-gray-300">
              {target_cfg.label}
            </span>.
          </p>
          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
              Admin notes <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              value={admin_notes}
              onChange={(e) => onNotesChange(e.target.value)}
              rows={3}
              placeholder="Add internal notes for this status change..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:bg-gray-800"
            />
          </div>
        </div>
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
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 ${
              is_cancelling
                ? "bg-error-600 hover:bg-error-700"
                : "bg-success-600 hover:bg-success-700"
            }`}
          >
            {is_saving && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            Confirm
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

  const [status_modal_target, setStatusModalTarget] = useState<AppointmentStatus | null>(null);
  const [modal_admin_notes, setModalAdminNotes] = useState("");
  const [is_saving_status, setIsSavingStatus] = useState(false);
  const [status_success, setStatusSuccess] = useState<string | null>(null);

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

  async function handleStatusConfirm() {
    if (!appointment || !status_modal_target) return;
    setIsSavingStatus(true);
    try {
      const payload: UpdateAppointmentStatusPayload = {
        status: status_modal_target,
        admin_notes: modal_admin_notes || undefined,
      };
      const updated = await adminSmeAppointmentService.updateAppointmentStatus(appointment.id, payload);
      setAppointment(updated);
      setStatusSuccess(`Status updated to ${STATUS_CONFIG[status_modal_target].label}`);
      setTimeout(() => setStatusSuccess(null), 4000);
    } catch {
      setError("Failed to update status. Please try again.");
    } finally {
      setIsSavingStatus(false);
      setStatusModalTarget(null);
      setModalAdminNotes("");
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
            {available_transitions.map((next_status) => {
              const next_cfg = STATUS_CONFIG[next_status];
              const is_danger = next_status === "cancelled";
              return (
                <button
                  key={next_status}
                  onClick={() => { setStatusModalTarget(next_status); setModalAdminNotes(""); }}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                    is_danger
                      ? "border border-error-200 bg-error-50 text-error-700 hover:bg-error-100 dark:border-error-700/30 dark:bg-error-500/10 dark:text-error-400 dark:hover:bg-error-500/20"
                      : "border border-success-200 bg-success-50 text-success-700 hover:bg-success-100 dark:border-success-700/30 dark:bg-success-500/10 dark:text-success-400 dark:hover:bg-success-500/20"
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${next_cfg.dot}`} />
                  Mark as {next_cfg.label}
                </button>
              );
            })}
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
        {status_success && (
          <div className="flex items-center gap-3 rounded-xl bg-success-50 px-4 py-3 text-sm text-success-700 dark:bg-success-500/10 dark:text-success-400">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {status_success}
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

            {/* Status history / current status */}
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
                        Can be moved to: {available_transitions.map((s) => STATUS_CONFIG[s].label).join(", ")}
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

      {/* Status update modal */}
      {status_modal_target && (
        <StatusUpdateModal
          current_status={appointment.status}
          target_status={status_modal_target}
          is_saving={is_saving_status}
          admin_notes={modal_admin_notes}
          onNotesChange={setModalAdminNotes}
          onConfirm={handleStatusConfirm}
          onCancel={() => { setStatusModalTarget(null); setModalAdminNotes(""); }}
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
