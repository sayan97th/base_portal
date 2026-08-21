"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  emailInterceptSettingsService,
  type EmailInterceptSettings,
  type EmailInterceptLogEntry,
} from "@/services/admin/email-intercept-settings.service";
import {
  AUTOMATED_EMAIL_CATALOG,
  type EmailAudience,
} from "./automatedEmailCatalog";

// ── Toggle Switch (mirrors the one used on the Comment Notifications tab) ──

interface ToggleSwitchProps {
  enabled: boolean;
  onChange: () => void;
  disabled?: boolean;
}

function ToggleSwitch({ enabled, onChange, disabled = false }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
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

function AudienceBadge({ audience }: { audience: EmailAudience }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        audience === "admin"
          ? "bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"
          : "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
      }`}
    >
      {audience === "admin" ? "Admin side" : "Client side"}
    </span>
  );
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function formatMailableName(mailable_class: string): string {
  const short_name = mailable_class.split("\\").pop() ?? mailable_class;
  return short_name.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
}

function formatTimestamp(iso_date: string): string {
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

// ── Loading Skeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-24 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="h-28 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
        <div className="h-28 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
      </div>
      <div className="h-48 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

const EmailInterceptorContent: React.FC = () => {
  const [is_loading, setIsLoading] = useState(true);
  const [is_saving, setIsSaving] = useState(false);
  const [intercept_admin_emails, setInterceptAdminEmails] = useState(false);
  const [intercept_client_emails, setInterceptClientEmails] = useState(false);
  const [recipient_emails, setRecipientEmails] = useState<string[]>([]);
  const [new_email_input, setNewEmailInput] = useState("");
  const [email_input_error, setEmailInputError] = useState("");
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [catalog_filter, setCatalogFilter] = useState<"all" | EmailAudience>("all");

  const [logs, setLogs] = useState<EmailInterceptLogEntry[]>([]);
  const [is_logs_loading, setIsLogsLoading] = useState(true);

  const original_state = useRef<{
    intercept_admin_emails: boolean;
    intercept_client_emails: boolean;
    recipient_emails: string[];
  } | null>(null);

  const alert_timeout_ref = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showAlert = useCallback((type: "success" | "error", message: string) => {
    if (alert_timeout_ref.current) clearTimeout(alert_timeout_ref.current);
    setAlert({ type, message });
    alert_timeout_ref.current = setTimeout(() => setAlert(null), 4500);
  }, []);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const settings: EmailInterceptSettings = await emailInterceptSettingsService.getSettings();

      setInterceptAdminEmails(settings.intercept_admin_emails);
      setInterceptClientEmails(settings.intercept_client_emails);
      setRecipientEmails(settings.recipient_emails);

      original_state.current = {
        intercept_admin_emails: settings.intercept_admin_emails,
        intercept_client_emails: settings.intercept_client_emails,
        recipient_emails: [...settings.recipient_emails],
      };
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message ?? "Failed to load interceptor settings";
      showAlert("error", message);
    } finally {
      setIsLoading(false);
    }
  }, [showAlert]);

  const loadLogs = useCallback(async () => {
    setIsLogsLoading(true);
    try {
      const recent_logs = await emailInterceptSettingsService.getRecentLogs();
      setLogs(recent_logs);
    } catch {
      // Non-critical — the settings card above still works without history.
    } finally {
      setIsLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
    loadLogs();
    return () => {
      if (alert_timeout_ref.current) clearTimeout(alert_timeout_ref.current);
    };
  }, [loadSettings, loadLogs]);

  function handleAddEmail() {
    const trimmed = new_email_input.trim().toLowerCase();
    if (!trimmed) {
      setEmailInputError("Please enter an email address");
      return;
    }
    if (!isValidEmail(trimmed)) {
      setEmailInputError("Please enter a valid email address");
      return;
    }
    if (recipient_emails.includes(trimmed)) {
      setEmailInputError("This email address has already been added");
      return;
    }
    setRecipientEmails((prev) => [...prev, trimmed]);
    setNewEmailInput("");
    setEmailInputError("");
  }

  function handleRemoveEmail(email: string) {
    setRecipientEmails((prev) => prev.filter((e) => e !== email));
  }

  function handleDiscard() {
    if (!original_state.current) return;
    const orig = original_state.current;
    setInterceptAdminEmails(orig.intercept_admin_emails);
    setInterceptClientEmails(orig.intercept_client_emails);
    setRecipientEmails([...orig.recipient_emails]);
    setNewEmailInput("");
    setEmailInputError("");
    setAlert(null);
  }

  async function handleSave() {
    if ((intercept_admin_emails || intercept_client_emails) && recipient_emails.length === 0) {
      showAlert("error", "Add at least one recipient email before turning on interception");
      return;
    }

    setIsSaving(true);
    try {
      await emailInterceptSettingsService.updateSettings({
        intercept_admin_emails,
        intercept_client_emails,
        recipient_emails,
      });

      original_state.current = {
        intercept_admin_emails,
        intercept_client_emails,
        recipient_emails: [...recipient_emails],
      };

      showAlert("success", "Email interceptor settings saved successfully");
      loadLogs();
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message ?? "Failed to save interceptor settings";
      showAlert("error", message);
    } finally {
      setIsSaving(false);
    }
  }

  const has_changes =
    original_state.current !== null &&
    (intercept_admin_emails !== original_state.current.intercept_admin_emails ||
      intercept_client_emails !== original_state.current.intercept_client_emails ||
      [...recipient_emails].sort().join(",") !==
        [...original_state.current.recipient_emails].sort().join(","));

  const admin_email_count = AUTOMATED_EMAIL_CATALOG.filter((e) => e.audience === "admin").length;
  const client_email_count = AUTOMATED_EMAIL_CATALOG.filter((e) => e.audience === "client").length;

  const filtered_catalog =
    catalog_filter === "all"
      ? AUTOMATED_EMAIL_CATALOG
      : AUTOMATED_EMAIL_CATALOG.filter((e) => e.audience === catalog_filter);

  if (is_loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      {/* ── Alert ─────────────────────────────────────────────────────────── */}
      {alert && (
        <div
          className={`flex items-center gap-3 rounded-xl border p-4 ${
            alert.type === "success"
              ? "border-green-200 bg-green-50 dark:border-green-500/20 dark:bg-green-500/10"
              : "border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-500/10"
          }`}
        >
          <p
            className={`flex-1 text-sm font-medium ${
              alert.type === "success"
                ? "text-green-800 dark:text-green-400"
                : "text-red-800 dark:text-red-400"
            }`}
          >
            {alert.message}
          </p>
          <button
            onClick={() => setAlert(null)}
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
      )}

      {/* ── Info Banner ───────────────────────────────────────────────────── */}
      <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
        <svg
          className="mt-0.5 h-5 w-5 shrink-0 text-amber-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div>
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            What this does
          </p>
          <p className="mt-1 text-sm leading-relaxed text-amber-700/90 dark:text-amber-400/90">
            When enabled, every automated email sent to the selected audience is copied,
            unchanged, to the addresses configured below, using a blind carbon copy so
            recipients never see it. Nothing about the original email changes: same subject,
            same content, same delivery time. Use this to see exactly what your admins or
            clients receive, and when.
          </p>
        </div>
      </div>

      {/* ── Audience Toggle Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex items-start justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
              <svg
                className="h-5 w-5 text-violet-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                Mirror admin-side emails
              </p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Copies every email your admin and staff team receives ({admin_email_count} email
                types, see reference below)
              </p>
            </div>
          </div>
          <ToggleSwitch
            enabled={intercept_admin_emails}
            onChange={() => setInterceptAdminEmails((prev) => !prev)}
          />
        </div>

        <div className="flex items-start justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
              <svg
                className="h-5 w-5 text-blue-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                Mirror client-side emails
              </p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Copies every email your clients receive, including link building status
                updates ({client_email_count} email types, see reference below)
              </p>
            </div>
          </div>
          <ToggleSwitch
            enabled={intercept_client_emails}
            onChange={() => setInterceptClientEmails((prev) => !prev)}
          />
        </div>
      </div>

      {/* ── Recipients Card ────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Copy destination
              </h2>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                Intercepted copies are sent to every address in this list
              </p>
            </div>
            {recipient_emails.length > 0 && (
              <span className="ml-4 shrink-0 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                {recipient_emails.length} added
              </span>
            )}
          </div>

          <div className="mt-5 flex gap-3">
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <svg
                  className="h-4 w-4 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                  />
                </svg>
              </div>
              <input
                type="email"
                value={new_email_input}
                onChange={(e) => {
                  setNewEmailInput(e.target.value);
                  if (email_input_error) setEmailInputError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddEmail();
                }}
                placeholder="Enter email address"
                className={`block w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent ${
                  email_input_error
                    ? "border-red-300 bg-red-50 dark:border-red-700/50 dark:bg-red-900/10"
                    : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
                } text-gray-900 placeholder:text-gray-400 dark:text-white dark:placeholder:text-gray-500`}
              />
            </div>
            <button
              type="button"
              onClick={handleAddEmail}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add
            </button>
          </div>
          {email_input_error && (
            <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{email_input_error}</p>
          )}

          <div className="mt-4">
            {recipient_emails.length > 0 ? (
              <div className="space-y-2">
                {recipient_emails.map((email) => (
                  <div
                    key={email}
                    className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5 dark:border-gray-800 dark:bg-gray-800/50"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300">{email}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveEmail(email)}
                      className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                      aria-label={`Remove ${email}`}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-8 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-400 dark:text-gray-500">
                  No copy destinations yet
                </p>
                <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-600">
                  Add an email address above to start receiving intercepted copies
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer / Actions ──────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 border-t border-gray-100 px-6 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {intercept_admin_emails || intercept_client_emails
              ? "Interception is active for the selected audience above"
              : "Interception is currently off"}
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDiscard}
              disabled={!has_changes || is_saving}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-transparent dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Discard Changes
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={is_saving}
              className="flex min-w-[130px] items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
            >
              {is_saving ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Automated Email Reference Catalog ──────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Automated emails in this system
            </h2>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Every automated email currently wired up, what triggers it, and roughly how
              long after the trigger it goes out
            </p>
          </div>
          <div className="flex shrink-0 gap-1.5 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
            {(["all", "admin", "client"] as const).map((filter_option) => (
              <button
                key={filter_option}
                type="button"
                onClick={() => setCatalogFilter(filter_option)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  catalog_filter === filter_option
                    ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                {filter_option === "all"
                  ? "All"
                  : filter_option === "admin"
                    ? "Admin side"
                    : "Client side"}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto border-t border-gray-100 dark:border-gray-800">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead>
              <tr className="border-b border-gray-100 uppercase tracking-wide text-gray-400 dark:border-gray-800 dark:text-gray-500">
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-2 py-2 font-medium">Audience</th>
                <th className="px-2 py-2 font-medium">Trigger</th>
                <th className="px-4 py-2 font-medium">Delay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered_catalog.map((entry) => (
                <tr key={entry.name}>
                  <td className="whitespace-nowrap px-4 py-1.5 font-medium leading-snug text-gray-900 dark:text-white">
                    {entry.name}
                  </td>
                  <td className="px-2 py-1.5 leading-snug">
                    <AudienceBadge audience={entry.audience} />
                  </td>
                  <td className="px-2 py-1.5 leading-snug text-gray-600 dark:text-gray-400">
                    {entry.trigger}
                  </td>
                  <td className="px-4 py-1.5 leading-snug text-gray-500 dark:text-gray-500">
                    {entry.delay}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Recent Intercepted Copies ──────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Recent intercepted copies
          </h2>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            The last 25 automated emails that were copied to the destinations above
          </p>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800">
          {is_logs_loading ? (
            <div className="space-y-3 p-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <p className="text-sm font-medium text-gray-400 dark:text-gray-500">
                No copies have gone out yet
              </p>
              <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-600">
                Once interception is on, every matching email will show up here
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 uppercase tracking-wide text-gray-400 dark:border-gray-800 dark:text-gray-500">
                    <th className="px-4 py-2 font-medium">When</th>
                    <th className="px-2 py-2 font-medium">Email</th>
                    <th className="px-2 py-2 font-medium">Audience</th>
                    <th className="px-2 py-2 font-medium">Original recipient</th>
                    <th className="px-4 py-2 font-medium">Copied to</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {logs.map((log_entry, index) => (
                    <tr key={`${log_entry.intercepted_at}-${index}`}>
                      <td className="whitespace-nowrap px-4 py-1.5 leading-snug text-gray-500 dark:text-gray-400">
                        {formatTimestamp(log_entry.intercepted_at)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5 font-medium leading-snug text-gray-900 dark:text-white">
                        {formatMailableName(log_entry.mailable_class)}
                      </td>
                      <td className="px-2 py-1.5 leading-snug">
                        <AudienceBadge audience={log_entry.audience} />
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5 leading-snug text-gray-600 dark:text-gray-400">
                        {log_entry.original_recipient_email}
                      </td>
                      <td className="px-4 py-1.5 leading-snug text-gray-500 dark:text-gray-500">
                        {log_entry.copied_to_emails.join(", ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailInterceptorContent;
