"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { listAdminUsers } from "@/services/admin/user.service";
import {
  emailNotificationSettingsService,
  type EmailNotificationSettings,
} from "@/services/admin/email-notification-settings.service";
import type { AdminUser } from "@/types/admin";

// ── Types ─────────────────────────────────────────────────────────────────────

interface RecipientState {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  role_display: string;
  is_enabled: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getRoleDisplay(user: AdminUser): string {
  if (!user.roles || user.roles.length === 0) return "Staff";
  const role = user.roles[0];
  if (typeof role === "string") return role;
  const typed = role as { display_name?: string; name: string };
  return typed.display_name || typed.name;
}

function getInitials(first_name: string, last_name: string): string {
  return `${first_name.charAt(0)}${last_name.charAt(0)}`.toUpperCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// ── Toggle Switch ─────────────────────────────────────────────────────────────

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

// ── Loading Skeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
        <div className="flex-1 space-y-2">
          <div className="h-7 w-64 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
          <div className="h-4 w-80 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
        </div>
      </div>
      <div className="h-20 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
      <div className="animate-pulse overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="space-y-4 p-6">
          <div className="h-5 w-40 rounded-lg bg-gray-200 dark:bg-gray-800" />
          <div className="h-16 rounded-xl bg-gray-200 dark:bg-gray-800" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-gray-800" />
                <div className="space-y-1.5">
                  <div className="h-4 w-32 rounded-lg bg-gray-200 dark:bg-gray-800" />
                  <div className="h-3 w-44 rounded-lg bg-gray-200 dark:bg-gray-800" />
                </div>
              </div>
              <div className="h-6 w-11 rounded-full bg-gray-200 dark:bg-gray-800" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

const EmailNotificationSettingsContent: React.FC = () => {
  const [is_loading, setIsLoading] = useState(true);
  const [is_saving, setIsSaving] = useState(false);
  const [notify_all_admins, setNotifyAllAdmins] = useState(true);
  const [recipients, setRecipients] = useState<RecipientState[]>([]);
  const [custom_emails, setCustomEmails] = useState<string[]>([]);
  const [new_email_input, setNewEmailInput] = useState("");
  const [email_input_error, setEmailInputError] = useState("");
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const original_state = useRef<{
    notify_all_admins: boolean;
    recipients: RecipientState[];
    custom_emails: string[];
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
      const users_response = await listAdminUsers({ page: 1 }, "staff");
      const active_users = users_response.data.filter((u) => u.is_active);

      let settings: EmailNotificationSettings = {
        notify_all_admins: true,
        enabled_user_ids: [],
        custom_emails: [],
      };

      try {
        settings = await emailNotificationSettingsService.getSettings();
      } catch {
        // Backend endpoint not yet available — default to notify all
      }

      const initial_recipients: RecipientState[] = active_users.map((user) => ({
        user_id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role_display: getRoleDisplay(user),
        is_enabled: settings.notify_all_admins
          ? true
          : settings.enabled_user_ids.includes(user.id),
      }));

      setNotifyAllAdmins(settings.notify_all_admins);
      setRecipients(initial_recipients);
      setCustomEmails(settings.custom_emails);

      original_state.current = {
        notify_all_admins: settings.notify_all_admins,
        recipients: initial_recipients.map((r) => ({ ...r })),
        custom_emails: [...settings.custom_emails],
      };
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message ?? "Failed to load settings";
      showAlert("error", message);
    } finally {
      setIsLoading(false);
    }
  }, [showAlert]);

  useEffect(() => {
    loadSettings();
    return () => {
      if (alert_timeout_ref.current) clearTimeout(alert_timeout_ref.current);
    };
  }, [loadSettings]);

  function handleToggleMasterSwitch() {
    setNotifyAllAdmins((prev) => !prev);
  }

  function handleToggleRecipient(user_id: number) {
    setRecipients((prev) =>
      prev.map((r) => (r.user_id === user_id ? { ...r, is_enabled: !r.is_enabled } : r))
    );
  }

  function handleAddCustomEmail() {
    const trimmed = new_email_input.trim().toLowerCase();
    if (!trimmed) {
      setEmailInputError("Please enter an email address");
      return;
    }
    if (!isValidEmail(trimmed)) {
      setEmailInputError("Please enter a valid email address");
      return;
    }
    if (custom_emails.includes(trimmed)) {
      setEmailInputError("This email address has already been added");
      return;
    }
    setCustomEmails((prev) => [...prev, trimmed]);
    setNewEmailInput("");
    setEmailInputError("");
  }

  function handleRemoveCustomEmail(email: string) {
    setCustomEmails((prev) => prev.filter((e) => e !== email));
  }

  function handleDiscard() {
    if (!original_state.current) return;
    const orig = original_state.current;
    setNotifyAllAdmins(orig.notify_all_admins);
    setRecipients(orig.recipients.map((r) => ({ ...r })));
    setCustomEmails([...orig.custom_emails]);
    setNewEmailInput("");
    setEmailInputError("");
    setAlert(null);
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const enabled_user_ids = notify_all_admins
        ? recipients.map((r) => r.user_id)
        : recipients.filter((r) => r.is_enabled).map((r) => r.user_id);

      await emailNotificationSettingsService.updateSettings({
        notify_all_admins,
        enabled_user_ids,
        custom_emails,
      });

      original_state.current = {
        notify_all_admins,
        recipients: recipients.map((r) => ({ ...r })),
        custom_emails: [...custom_emails],
      };

      showAlert("success", "Notification settings saved successfully");
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message ?? "Failed to save settings";
      showAlert("error", message);
    } finally {
      setIsSaving(false);
    }
  }

  const total_recipients =
    (notify_all_admins
      ? recipients.length
      : recipients.filter((r) => r.is_enabled).length) + custom_emails.length;

  const has_changes =
    original_state.current !== null &&
    (notify_all_admins !== original_state.current.notify_all_admins ||
      [...custom_emails].sort().join(",") !==
        [...original_state.current.custom_emails].sort().join(",") ||
      recipients.some(
        (r, i) => original_state.current!.recipients[i]?.is_enabled !== r.is_enabled
      ));

  if (is_loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">

      {/* ── Section intro + recipient count stat ───────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Order Comment Notifications
          </h2>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Manage who receives email alerts when clients comment on their orders
          </p>
        </div>

        {/* Recipient count stat */}
        <div className="flex shrink-0 items-center gap-3 rounded-xl border border-gray-200 bg-white px-5 py-3 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500/10">
            <svg
              className="h-4 w-4 text-brand-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
              />
            </svg>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Active recipients</p>
            <p className="text-2xl font-bold leading-tight text-gray-900 dark:text-white">
              {total_recipients}
            </p>
          </div>
        </div>
      </div>

      {/* ── Alert ─────────────────────────────────────────────────────────── */}
      {alert && (
        <div
          className={`flex items-center gap-3 rounded-xl border p-4 ${
            alert.type === "success"
              ? "border-green-200 bg-green-50 dark:border-green-500/20 dark:bg-green-500/10"
              : "border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-500/10"
          }`}
        >
          {alert.type === "success" ? (
            <svg
              className="h-5 w-5 shrink-0 text-green-500"
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
          ) : (
            <svg
              className="h-5 w-5 shrink-0 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
          )}
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
      <div className="flex gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/20 dark:bg-blue-500/10">
        <svg
          className="mt-0.5 h-5 w-5 shrink-0 text-blue-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
          />
        </svg>
        <div>
          <p className="text-sm font-medium text-blue-800 dark:text-blue-300">How it works</p>
          <p className="mt-1 text-sm leading-relaxed text-blue-700/90 dark:text-blue-400/90">
            When a client submits a comment on an order, the selected recipients will receive an
            email notification. By default, all active admin users are notified — but you can
            customize this to specific individuals or add external email addresses.
          </p>
        </div>
      </div>

      {/* ── Main Settings Card ────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">

        {/* ── Admin Recipients ───────────────────────────────────────────── */}
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Admin Recipients
              </h2>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                Control which admin users receive order comment notifications
              </p>
            </div>
            <span className="ml-4 shrink-0 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              {recipients.length} admin{recipients.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Master toggle row */}
          <div className="mt-5 flex items-center justify-between rounded-xl bg-gray-50 px-4 py-4 dark:bg-gray-800/50">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/10">
                <svg
                  className="h-4 w-4 text-brand-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Notify all active admins
                </p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  All {recipients.length} active admin{recipients.length !== 1 ? "s" : ""} will
                  receive email notifications
                </p>
              </div>
            </div>
            <ToggleSwitch enabled={notify_all_admins} onChange={handleToggleMasterSwitch} />
          </div>

          {/* User list */}
          <div className="mt-5">
            {notify_all_admins ? (
              /* Chip view: all admins selected */
              <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  All admins receiving notifications
                </p>
                {recipients.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    No active admin users found
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {recipients.map((recipient) => (
                      <div
                        key={recipient.user_id}
                        className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 dark:border-gray-700 dark:bg-gray-800"
                      >
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500/20 text-[10px] font-semibold text-brand-600 dark:text-brand-400">
                          {getInitials(recipient.first_name, recipient.last_name)}
                        </div>
                        <span className="text-xs text-gray-700 dark:text-gray-300">
                          {recipient.first_name} {recipient.last_name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Individual selection view */
              <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  Select individual recipients
                </p>
                {recipients.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    No active admin users found
                  </p>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {recipients.map((recipient) => (
                      <div
                        key={recipient.user_id}
                        className="flex items-center justify-between py-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-sm font-semibold text-white">
                            {getInitials(recipient.first_name, recipient.last_name)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {recipient.first_name} {recipient.last_name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {recipient.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="hidden rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 sm:inline-block">
                            {recipient.role_display}
                          </span>
                          <ToggleSwitch
                            enabled={recipient.is_enabled}
                            onChange={() => handleToggleRecipient(recipient.user_id)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Section divider */}
        <div className="h-px bg-gray-100 dark:bg-gray-800" />

        {/* ── Additional Recipients ──────────────────────────────────────── */}
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Additional Recipients
              </h2>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                Add external email addresses to also receive order comment notifications
              </p>
            </div>
            {custom_emails.length > 0 && (
              <span className="ml-4 shrink-0 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                {custom_emails.length} added
              </span>
            )}
          </div>

          {/* Email input */}
          <div className="mt-5">
            <div className="flex gap-3">
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
                    if (e.key === "Enter") handleAddCustomEmail();
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
                onClick={handleAddCustomEmail}
                className="flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add
              </button>
            </div>
            {email_input_error && (
              <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{email_input_error}</p>
            )}
          </div>

          {/* Custom email list / empty state */}
          <div className="mt-4">
            {custom_emails.length > 0 ? (
              <div className="space-y-2">
                {custom_emails.map((email) => (
                  <div
                    key={email}
                    className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5 dark:border-gray-800 dark:bg-gray-800/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                        <svg
                          className="h-4 w-4 text-gray-500 dark:text-gray-400"
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
                        <p className="text-sm text-gray-700 dark:text-gray-300">{email}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          External recipient
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomEmail(email)}
                      className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                      aria-label={`Remove ${email}`}
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-8 dark:border-gray-700">
                <svg
                  className="h-8 w-8 text-gray-300 dark:text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                  />
                </svg>
                <p className="mt-2 text-sm font-medium text-gray-400 dark:text-gray-500">
                  No additional recipients
                </p>
                <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-600">
                  Add email addresses above to include external recipients
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer / Actions ──────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 border-t border-gray-100 px-6 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              {total_recipients}
            </span>{" "}
            recipient{total_recipients !== 1 ? "s" : ""} will receive order comment notifications
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
                <>
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailNotificationSettingsContent;
