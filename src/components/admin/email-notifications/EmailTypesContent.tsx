"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { ROLES } from "@/lib/roles";
import {
  emailDeliverySettingsService,
  type EmailSuppressionLogEntry,
  type EmailTypeCategory,
  type EmailTypeDefinition,
} from "@/services/admin/email-delivery-settings.service";
import {
  AlwaysSentBadge,
  EmailTypeAudienceBadge,
  StatusAlert,
  SUPPRESSION_REASON_LABELS,
  ToggleSwitch,
  formatTimestamp,
  getErrorMessage,
  useStatusAlert,
} from "./EmailSettingsShared";

type AudienceFilter = "all" | "admin" | "client";

const AUDIENCE_FILTERS: { key: AudienceFilter; label: string }[] = [
  { key: "all", label: "All emails" },
  { key: "admin", label: "Admin side" },
  { key: "client", label: "Client side" },
];

function matchesAudienceFilter(email_type: EmailTypeDefinition, filter: AudienceFilter): boolean {
  if (filter === "all" || email_type.audience === "any") return true;
  return email_type.audience === filter;
}

// ── Loading Skeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-20 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
      <div className="h-10 w-72 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-40 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
      ))}
    </div>
  );
}

// ── Recently Blocked Emails ───────────────────────────────────────────────────

function SuppressionLogList({
  logs,
  email_type_labels,
  is_loading,
  onRefresh,
}: {
  logs: EmailSuppressionLogEntry[];
  email_type_labels: Record<string, string>;
  is_loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-4 p-6">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Recently blocked emails
          </h3>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Emails that were not delivered because of these settings or a recipient&apos;s
            personal preferences
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={is_loading}
          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <svg
            className={`h-3.5 w-3.5 ${is_loading ? "animate-spin" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
            />
          </svg>
          Refresh
        </button>
      </div>

      {logs.length === 0 ? (
        <div className="border-t border-gray-100 px-6 py-8 text-center dark:border-gray-800">
          <p className="text-sm text-gray-400 dark:text-gray-500">No emails have been blocked yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto border-t border-gray-100 dark:border-gray-800">
          <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                {["Recipient", "Email", "Reason", "Blocked at"].map((heading) => (
                  <th
                    key={heading}
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {logs.map((log, index) => (
                <tr key={`${log.recipient_email}-${log.suppressed_at}-${index}`}>
                  <td className="whitespace-nowrap px-6 py-3 text-gray-700 dark:text-gray-300">
                    {log.recipient_email}
                  </td>
                  <td className="px-6 py-3">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {(log.email_type && email_type_labels[log.email_type]) ?? "Unknown email"}
                    </p>
                    {log.subject && (
                      <p className="mt-0.5 max-w-xs truncate text-xs text-gray-500 dark:text-gray-400">
                        {log.subject}
                      </p>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-3 text-gray-600 dark:text-gray-400">
                    {SUPPRESSION_REASON_LABELS[log.reason] ?? log.reason}
                  </td>
                  <td className="whitespace-nowrap px-6 py-3 text-gray-500 dark:text-gray-400">
                    {formatTimestamp(log.suppressed_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

const EmailTypesContent: React.FC = () => {
  const { hasRole } = useAuth();
  const can_edit = hasRole(ROLES.SUPER_ADMIN) || hasRole(ROLES.ADMIN);

  const [is_loading, setIsLoading] = useState(true);
  const [is_saving, setIsSaving] = useState(false);
  const [categories, setCategories] = useState<EmailTypeCategory[]>([]);
  const [email_types, setEmailTypes] = useState<EmailTypeDefinition[]>([]);
  const [enabled_by_key, setEnabledByKey] = useState<Record<string, boolean>>({});
  const [audience_filter, setAudienceFilter] = useState<AudienceFilter>("all");
  const [logs, setLogs] = useState<EmailSuppressionLogEntry[]>([]);
  const [is_loading_logs, setIsLoadingLogs] = useState(true);
  const [original_enabled_by_key, setOriginalEnabledByKey] = useState<Record<string, boolean>>({});
  const { alert, showAlert, clearAlert } = useStatusAlert();

  const loadLogs = useCallback(() => {
    return emailDeliverySettingsService
      .getSuppressionLogs()
      .then(setLogs)
      .catch(() => {
        // The log list is informational, a failure here should not block the settings form.
      })
      .finally(() => setIsLoadingLogs(false));
  }, []);

  useEffect(() => {
    let is_active = true;

    emailDeliverySettingsService
      .getEmailTypes()
      .then((response) => {
        if (!is_active) return;
        const initial_enabled_by_key = Object.fromEntries(
          response.email_types.map((email_type) => [email_type.key, email_type.is_enabled])
        );
        setCategories(response.categories);
        setEmailTypes(response.email_types);
        setEnabledByKey(initial_enabled_by_key);
        setOriginalEnabledByKey(initial_enabled_by_key);
      })
      .catch((err: unknown) => {
        if (is_active) showAlert("error", getErrorMessage(err, "Failed to load email types"));
      })
      .finally(() => {
        if (is_active) setIsLoading(false);
      });

    loadLogs();

    return () => {
      is_active = false;
    };
  }, [loadLogs, showAlert]);

  const email_type_labels = useMemo(
    () => Object.fromEntries(email_types.map((email_type) => [email_type.key, email_type.label])),
    [email_types]
  );

  const visible_groups = useMemo(
    () =>
      categories
        .map((category) => ({
          category,
          email_types: email_types.filter(
            (email_type) =>
              email_type.category === category.key &&
              matchesAudienceFilter(email_type, audience_filter)
          ),
        }))
        .filter((group) => group.email_types.length > 0),
    [categories, email_types, audience_filter]
  );

  const configurable_types = email_types.filter((email_type) => !email_type.is_mandatory);
  const active_count = configurable_types.filter((email_type) => enabled_by_key[email_type.key]).length;
  const changed_keys = configurable_types
    .map((email_type) => email_type.key)
    .filter((key) => enabled_by_key[key] !== original_enabled_by_key[key]);
  const has_changes = changed_keys.length > 0;

  function handleToggleType(key: string) {
    setEnabledByKey((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleToggleGroup(group_types: EmailTypeDefinition[]) {
    const configurable = group_types.filter((email_type) => !email_type.is_mandatory);
    const turn_on = configurable.some((email_type) => !enabled_by_key[email_type.key]);

    setEnabledByKey((prev) => {
      const next = { ...prev };
      configurable.forEach((email_type) => {
        next[email_type.key] = turn_on;
      });
      return next;
    });
  }

  function handleRefreshLogs() {
    setIsLoadingLogs(true);
    loadLogs();
  }

  function handleDiscard() {
    setEnabledByKey({ ...original_enabled_by_key });
    clearAlert();
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      await emailDeliverySettingsService.updateEmailTypes({
        email_types: changed_keys.map((key) => ({ key, is_enabled: enabled_by_key[key] })),
      });
      setOriginalEnabledByKey({ ...enabled_by_key });
      showAlert("success", "Email types saved successfully");
    } catch (err: unknown) {
      showAlert("error", getErrorMessage(err, "Failed to save email types"));
    } finally {
      setIsSaving(false);
    }
  }

  if (is_loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      {/* ── Section intro + active count ─────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Email Types</h2>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Turn each type of admin side email on or off for every recipient
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3 rounded-xl border border-gray-200 bg-white px-5 py-3 dark:border-gray-800 dark:bg-gray-900">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Active email types</p>
            <p className="text-2xl font-bold leading-tight text-gray-900 dark:text-white">
              {active_count}
              <span className="text-base font-medium text-gray-400 dark:text-gray-500">
                {" "}
                / {configurable_types.length}
              </span>
            </p>
          </div>
        </div>
      </div>

      {alert && <StatusAlert alert={alert} onDismiss={clearAlert} />}

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
            Every email sent by BASE Portal is checked against these settings before it leaves the
            platform. Turning an email type off stops it for every admin side recipient. To stop
            emails for a single person only, use the User Preferences tab. Client side users always
            receive their emails, so client emails, together with account and security emails such
            as password resets and invitations, are always delivered.
          </p>
        </div>
      </div>

      {!can_edit && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
          Only admins can change which email types are sent. You can still manage your own emails
          from the User Preferences tab.
        </div>
      )}

      {/* ── Audience filter ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter email types by audience">
        {AUDIENCE_FILTERS.map((filter) => (
          <button
            key={filter.key}
            type="button"
            onClick={() => setAudienceFilter(filter.key)}
            aria-pressed={audience_filter === filter.key}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
              audience_filter === filter.key
                ? "border-brand-500 bg-brand-500 text-white"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* ── Category groups ───────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        {visible_groups.map((group, group_index) => {
          const configurable = group.email_types.filter((email_type) => !email_type.is_mandatory);
          const all_enabled =
            configurable.length > 0 &&
            configurable.every((email_type) => enabled_by_key[email_type.key]);

          return (
            <section
              key={group.category.key}
              className={group_index > 0 ? "border-t border-gray-100 dark:border-gray-800" : ""}
            >
              <div className="flex items-center justify-between gap-4 bg-gray-50 px-6 py-3 dark:bg-gray-800/50">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {group.category.label}
                </h3>
                {configurable.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {all_enabled ? "All on" : "Turn all on"}
                    </span>
                    <ToggleSwitch
                      enabled={all_enabled}
                      onChange={() => handleToggleGroup(group.email_types)}
                      disabled={!can_edit || is_saving}
                      label={`Toggle every email in ${group.category.label}`}
                    />
                  </div>
                )}
              </div>

              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {group.email_types.map((email_type) => (
                  <li
                    key={email_type.key}
                    className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {email_type.label}
                        </p>
                        <EmailTypeAudienceBadge audience={email_type.audience} />
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {email_type.description}
                      </p>
                    </div>
                    {email_type.is_mandatory ? (
                      <AlwaysSentBadge audience={email_type.audience} />
                    ) : (
                      <ToggleSwitch
                        enabled={Boolean(enabled_by_key[email_type.key])}
                        onChange={() => handleToggleType(email_type.key)}
                        disabled={!can_edit || is_saving}
                        label={`Send ${email_type.label}`}
                      />
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        {/* ── Footer / Actions ──────────────────────────────────────────── */}
        {can_edit && (
          <div className="flex flex-col gap-3 border-t border-gray-100 px-6 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {has_changes
                ? `${changed_keys.length} unsaved change${changed_keys.length !== 1 ? "s" : ""}`
                : "All changes saved"}
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
                disabled={!has_changes || is_saving}
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
        )}
      </div>

      <SuppressionLogList
        logs={logs}
        email_type_labels={email_type_labels}
        is_loading={is_loading_logs}
        onRefresh={handleRefreshLogs}
      />
    </div>
  );
};

export default EmailTypesContent;
