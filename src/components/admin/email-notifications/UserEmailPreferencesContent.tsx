"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { ROLES } from "@/lib/roles";
import {
  emailDeliverySettingsService,
  type AdminUserEmailPreference,
  type EmailTypeCategory,
  type EmailTypeDefinition,
  type UserEmailPreference,
} from "@/services/admin/email-delivery-settings.service";
import {
  AlwaysSentBadge,
  StatusAlert,
  ToggleSwitch,
  getErrorMessage,
  useStatusAlert,
} from "./EmailSettingsShared";

// ── Types ─────────────────────────────────────────────────────────────────────

type DeliveryMode = "all" | "custom" | "none";

interface PreferenceDraft {
  mode: DeliveryMode;
  disabled_email_types: string[];
}

const DELIVERY_MODES: { key: DeliveryMode; title: string; description: string }[] = [
  {
    key: "all",
    title: "All emails",
    description: "Receives every BASE Portal email sent to them",
  },
  {
    key: "custom",
    title: "Only selected emails",
    description: "Choose exactly which emails they receive",
  },
  {
    key: "none",
    title: "No emails",
    description: "Mute every BASE Portal email, except account and security emails",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(first_name: string, last_name: string): string {
  return `${first_name.charAt(0)}${last_name.charAt(0)}`.toUpperCase();
}

function toDraft(user: AdminUserEmailPreference): PreferenceDraft {
  let mode: DeliveryMode = "all";
  if (user.mute_all_emails) mode = "none";
  else if (user.disabled_email_types.length > 0) mode = "custom";

  return { mode, disabled_email_types: [...user.disabled_email_types] };
}

// The custom selection is kept while muted, so un-muting later restores it.
// In "all" mode the selection is dropped, since it has no effect.
function toPayload(draft: PreferenceDraft): UserEmailPreference {
  return {
    mute_all_emails: draft.mode === "none",
    disabled_email_types: draft.mode === "all" ? [] : draft.disabled_email_types,
  };
}

function isSameDraft(a: PreferenceDraft, b: PreferenceDraft): boolean {
  const payload_a = toPayload(a);
  const payload_b = toPayload(b);
  return (
    a.mode === b.mode &&
    [...payload_a.disabled_email_types].sort().join(",") ===
      [...payload_b.disabled_email_types].sort().join(",")
  );
}

function describePreference(user: AdminUserEmailPreference): { label: string; class_name: string } {
  if (user.mute_all_emails) {
    return {
      label: "Muted",
      class_name: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300",
    };
  }

  if (user.disabled_email_types.length > 0) {
    const count = user.disabled_email_types.length;
    return {
      label: `${count} email${count !== 1 ? "s" : ""} off`,
      class_name: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    };
  }

  return {
    label: "All emails",
    class_name: "bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300",
  };
}

// ── Loading Skeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
      <div className="h-96 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
      <div className="h-96 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

const UserEmailPreferencesContent: React.FC = () => {
  const { user: current_user, hasRole } = useAuth();
  const can_manage_everyone = hasRole(ROLES.SUPER_ADMIN) || hasRole(ROLES.ADMIN);

  const [is_loading, setIsLoading] = useState(true);
  const [is_saving, setIsSaving] = useState(false);
  const [users, setUsers] = useState<AdminUserEmailPreference[]>([]);
  const [categories, setCategories] = useState<EmailTypeCategory[]>([]);
  const [email_types, setEmailTypes] = useState<EmailTypeDefinition[]>([]);
  const [selected_user_id, setSelectedUserId] = useState<number | null>(null);
  const [draft, setDraft] = useState<PreferenceDraft | null>(null);
  const [search_query, setSearchQuery] = useState("");
  const { alert, showAlert, clearAlert } = useStatusAlert();

  useEffect(() => {
    let is_active = true;

    emailDeliverySettingsService
      .getUserPreferences()
      .then((response) => {
        if (!is_active) return;
        setUsers(response.users);
        setCategories(response.categories);
        setEmailTypes(response.email_types);

        // Open the signed in user's own preferences first, the most common reason to visit this tab.
        const initial_user =
          response.users.find((user) => user.id === current_user?.id) ?? response.users[0] ?? null;
        setSelectedUserId(initial_user?.id ?? null);
        setDraft(initial_user ? toDraft(initial_user) : null);
      })
      .catch((err: unknown) => {
        if (is_active) {
          showAlert("error", getErrorMessage(err, "Failed to load user email preferences"));
        }
      })
      .finally(() => {
        if (is_active) setIsLoading(false);
      });

    return () => {
      is_active = false;
    };
  }, [current_user?.id, showAlert]);

  const selected_user = users.find((user) => user.id === selected_user_id) ?? null;
  const can_edit_selected =
    selected_user !== null && (can_manage_everyone || selected_user.id === current_user?.id);
  const has_changes =
    selected_user !== null && draft !== null && !isSameDraft(draft, toDraft(selected_user));

  const filtered_users = useMemo(() => {
    const query = search_query.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) =>
      `${user.first_name} ${user.last_name} ${user.email}`.toLowerCase().includes(query)
    );
  }, [users, search_query]);

  const grouped_email_types = useMemo(
    () =>
      categories
        .map((category) => ({
          category,
          email_types: email_types.filter((email_type) => email_type.category === category.key),
        }))
        .filter((group) => group.email_types.length > 0),
    [categories, email_types]
  );

  const muted_count = users.filter((user) => user.mute_all_emails).length;
  const customized_count = users.filter(
    (user) => !user.mute_all_emails && user.disabled_email_types.length > 0
  ).length;

  function handleSelectUser(user: AdminUserEmailPreference) {
    if (user.id === selected_user_id) return;
    if (has_changes && !window.confirm("You have unsaved changes. Discard them and continue?")) {
      return;
    }
    setSelectedUserId(user.id);
    setDraft(toDraft(user));
    clearAlert();
  }

  function handleChangeMode(mode: DeliveryMode) {
    setDraft((prev) => (prev ? { ...prev, mode } : prev));
  }

  function isReceiving(email_type: EmailTypeDefinition): boolean {
    return !draft?.disabled_email_types.includes(email_type.key);
  }

  function handleToggleType(key: string) {
    setDraft((prev) => {
      if (!prev) return prev;
      const is_disabled = prev.disabled_email_types.includes(key);
      return {
        ...prev,
        disabled_email_types: is_disabled
          ? prev.disabled_email_types.filter((disabled_key) => disabled_key !== key)
          : [...prev.disabled_email_types, key],
      };
    });
  }

  function handleToggleGroup(group_types: EmailTypeDefinition[]) {
    const configurable_keys = group_types
      .filter((email_type) => !email_type.is_mandatory)
      .map((email_type) => email_type.key);

    setDraft((prev) => {
      if (!prev) return prev;
      const turn_on = configurable_keys.some((key) => prev.disabled_email_types.includes(key));
      const without_group = prev.disabled_email_types.filter(
        (key) => !configurable_keys.includes(key)
      );
      return {
        ...prev,
        disabled_email_types: turn_on ? without_group : [...without_group, ...configurable_keys],
      };
    });
  }

  function handleDiscard() {
    if (selected_user) setDraft(toDraft(selected_user));
    clearAlert();
  }

  async function handleSave() {
    if (!selected_user || !draft) return;

    setIsSaving(true);
    try {
      const response = await emailDeliverySettingsService.updateUserPreference(
        selected_user.id,
        toPayload(draft)
      );

      const updated_user: AdminUserEmailPreference = { ...selected_user, ...response.preference };
      setUsers((prev) => prev.map((user) => (user.id === updated_user.id ? updated_user : user)));
      setDraft(toDraft(updated_user));
      showAlert("success", `Email preferences saved for ${selected_user.first_name}`);
    } catch (err: unknown) {
      showAlert("error", getErrorMessage(err, "Failed to save email preferences"));
    } finally {
      setIsSaving(false);
    }
  }

  if (is_loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      {/* ── Section intro + stats ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            User Email Preferences
          </h2>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Choose which BASE Portal emails each admin side user receives
          </p>
        </div>
        <div className="flex shrink-0 gap-3">
          {[
            { label: "Customized", value: customized_count },
            { label: "Muted", value: muted_count },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-gray-200 bg-white px-5 py-3 dark:border-gray-800 dark:bg-gray-900"
            >
              <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
              <p className="text-2xl font-bold leading-tight text-gray-900 dark:text-white">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {alert && <StatusAlert alert={alert} onDismiss={clearAlert} />}

      {!can_manage_everyone && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
          You can change your own email preferences. Only admins can change them for other users.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        {/* ── User list ──────────────────────────────────────────────────── */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-100 p-4 dark:border-gray-800">
            <input
              type="search"
              value={search_query}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users"
              aria-label="Search users"
              className="block w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 hover:border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
            />
          </div>

          {filtered_users.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
              No users found
            </p>
          ) : (
            <ul className="max-h-[560px] divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800">
              {filtered_users.map((user) => {
                const status = describePreference(user);
                const is_selected = user.id === selected_user_id;

                return (
                  <li key={user.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectUser(user)}
                      aria-current={is_selected}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                        is_selected
                          ? "bg-brand-500/10 dark:bg-brand-500/15"
                          : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      }`}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-sm font-semibold text-white">
                        {getInitials(user.first_name, user.last_name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                          {user.first_name} {user.last_name}
                          {user.id === current_user?.id && (
                            <span className="ml-1 text-xs font-normal text-gray-400">(you)</span>
                          )}
                        </p>
                        <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                          {user.email}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${status.class_name}`}
                      >
                        {status.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* ── Preference editor ─────────────────────────────────────────── */}
        {selected_user && draft ? (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-start justify-between gap-4 p-6">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  {selected_user.first_name} {selected_user.last_name}
                </h3>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                  {selected_user.email}
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                {selected_user.role_display}
              </span>
            </div>

            {/* Delivery mode */}
            <div
              role="radiogroup"
              aria-label="Email delivery mode"
              className="grid grid-cols-1 gap-3 px-6 sm:grid-cols-3"
            >
              {DELIVERY_MODES.map((mode) => {
                const is_active = draft.mode === mode.key;
                return (
                  <button
                    key={mode.key}
                    type="button"
                    role="radio"
                    aria-checked={is_active}
                    disabled={!can_edit_selected || is_saving}
                    onClick={() => handleChangeMode(mode.key)}
                    className={`rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                      is_active
                        ? mode.key === "none"
                          ? "border-red-400 bg-red-50 dark:border-red-500/50 dark:bg-red-500/10"
                          : "border-brand-500 bg-brand-500/5 dark:bg-brand-500/10"
                        : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                    }`}
                  >
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{mode.title}</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {mode.description}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Per email type selection */}
            <div className="mt-6 border-t border-gray-100 dark:border-gray-800">
              {draft.mode === "custom" ? (
                grouped_email_types.map((group) => {
                  const configurable = group.email_types.filter(
                    (email_type) => !email_type.is_mandatory
                  );
                  const all_receiving =
                    configurable.length > 0 && configurable.every(isReceiving);

                  return (
                    <section
                      key={group.category.key}
                      className="border-b border-gray-100 last:border-b-0 dark:border-gray-800"
                    >
                      <div className="flex items-center justify-between gap-4 bg-gray-50 px-6 py-3 dark:bg-gray-800/50">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                          {group.category.label}
                        </h4>
                        {configurable.length > 0 && (
                          <ToggleSwitch
                            enabled={all_receiving}
                            onChange={() => handleToggleGroup(group.email_types)}
                            disabled={!can_edit_selected || is_saving}
                            label={`Toggle every email in ${group.category.label}`}
                          />
                        )}
                      </div>
                      <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                        {group.email_types.map((email_type) => (
                          <li
                            key={email_type.key}
                            className="flex items-center justify-between gap-4 px-6 py-3.5"
                          >
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {email_type.label}
                                </p>
                                {!email_type.is_enabled && (
                                  <span
                                    title="This email type is turned off for everyone in the Email Types tab"
                                    className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                                  >
                                    Off for everyone
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                                {email_type.description}
                              </p>
                            </div>
                            {email_type.is_mandatory ? (
                              <AlwaysSentBadge />
                            ) : (
                              <ToggleSwitch
                                enabled={isReceiving(email_type)}
                                onChange={() => handleToggleType(email_type.key)}
                                disabled={!can_edit_selected || is_saving}
                                label={`Receive ${email_type.label}`}
                              />
                            )}
                          </li>
                        ))}
                      </ul>
                    </section>
                  );
                })
              ) : (
                <p className="px-6 py-6 text-sm text-gray-500 dark:text-gray-400">
                  {draft.mode === "all"
                    ? `${selected_user.first_name} receives every email that is turned on in the Email Types tab.`
                    : `${selected_user.first_name} will not receive any BASE Portal emails. Password resets and invitations are still delivered so they never lose access to their account.`}
                </p>
              )}
            </div>

            {/* Footer / Actions */}
            {can_edit_selected && (
              <div className="flex flex-col gap-3 border-t border-gray-100 px-6 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-end">
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
                    "Save Preferences"
                  )}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 p-12 text-sm text-gray-400 dark:border-gray-700 dark:text-gray-500">
            Select a user to manage their email preferences
          </div>
        )}
      </div>
    </div>
  );
};

export default UserEmailPreferencesContent;
