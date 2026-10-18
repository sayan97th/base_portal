"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type {
  EmailSuppressionReason,
  EmailTypeAudience,
} from "@/services/admin/email-delivery-settings.service";

// ── Toggle Switch ─────────────────────────────────────────────────────────────

interface ToggleSwitchProps {
  enabled: boolean;
  onChange: () => void;
  disabled?: boolean;
  label?: string;
}

export function ToggleSwitch({ enabled, onChange, disabled = false, label }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
        enabled ? "bg-brand-500" : "bg-gray-200 dark:bg-gray-700"
      } ${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
          enabled ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

// ── Status Alert ──────────────────────────────────────────────────────────────

export interface StatusAlertState {
  type: "success" | "error";
  message: string;
}

/**
 * Holds a dismissible success/error banner that hides itself after a few
 * seconds, the same behavior every tab on this page uses.
 */
export function useStatusAlert() {
  const [alert, setAlert] = useState<StatusAlertState | null>(null);
  const timeout_ref = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showAlert = useCallback((type: StatusAlertState["type"], message: string) => {
    if (timeout_ref.current) clearTimeout(timeout_ref.current);
    setAlert({ type, message });
    timeout_ref.current = setTimeout(() => setAlert(null), 4500);
  }, []);

  const clearAlert = useCallback(() => setAlert(null), []);

  useEffect(() => {
    return () => {
      if (timeout_ref.current) clearTimeout(timeout_ref.current);
    };
  }, []);

  return { alert, showAlert, clearAlert };
}

export function StatusAlert({
  alert,
  onDismiss,
}: {
  alert: StatusAlertState;
  onDismiss: () => void;
}) {
  const is_success = alert.type === "success";

  return (
    <div
      role={is_success ? "status" : "alert"}
      className={`flex items-center gap-3 rounded-xl border p-4 ${
        is_success
          ? "border-green-200 bg-green-50 dark:border-green-500/20 dark:bg-green-500/10"
          : "border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-500/10"
      }`}
    >
      <svg
        className={`h-5 w-5 shrink-0 ${is_success ? "text-green-500" : "text-red-500"}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d={
            is_success
              ? "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              : "M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
          }
        />
      </svg>
      <p
        className={`flex-1 text-sm font-medium ${
          is_success ? "text-green-800 dark:text-green-400" : "text-red-800 dark:text-red-400"
        }`}
      >
        {alert.message}
      </p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="rounded p-0.5 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200"
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}

// ── Badges ────────────────────────────────────────────────────────────────────

const AUDIENCE_BADGE_STYLES: Record<EmailTypeAudience, { label: string; class_name: string }> = {
  admin: {
    label: "Admin side",
    class_name: "bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  },
  client: {
    label: "Client side",
    class_name: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  },
  any: {
    label: "Admin and client",
    class_name: "bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
  },
};

export function EmailTypeAudienceBadge({ audience }: { audience: EmailTypeAudience }) {
  const style = AUDIENCE_BADGE_STYLES[audience];

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style.class_name}`}
    >
      {style.label}
    </span>
  );
}

export function AlwaysSentBadge({ audience }: { audience: EmailTypeAudience }) {
  return (
    <span
      title={
        audience === "client"
          ? "Client side users always receive their emails"
          : "Account and security emails are always delivered"
      }
      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400"
    >
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
        />
      </svg>
      Always sent
    </span>
  );
}

// ── Formatting ────────────────────────────────────────────────────────────────

export const SUPPRESSION_REASON_LABELS: Record<EmailSuppressionReason, string> = {
  email_type_disabled: "Email type turned off",
  recipient_muted_all: "Recipient muted all emails",
  recipient_opted_out: "Recipient opted out of this email",
};

export function formatTimestamp(iso_date: string): string {
  try {
    return new Date(iso_date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso_date;
  }
}

export function getErrorMessage(err: unknown, fallback: string): string {
  return (err as { message?: string })?.message ?? fallback;
}
