"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { notificationRedirectService } from "@/services/admin/notification-redirect.service";
import { impersonationService } from "@/services/admin/impersonation.service";
import { getSafeRedirectPath } from "@/lib/safe-redirect";
import type { NotificationRedirectContext } from "@/types/admin";
import type { ApiError } from "@/types/auth";

interface NotificationRedirectGateProps {
  notification_id: string | null;
}

type GateState =
  | { status: "loading" }
  | { status: "invalid" }
  | { status: "error"; message: string }
  | { status: "ready"; context: NotificationRedirectContext };

const ADMIN_HOME_PATH = "/admin/dashboard";
const NOTIFICATION_ID_PATTERN = /^[1-9][0-9]*$/;

function getInitials(first_name: string, last_name: string): string {
  return `${first_name.charAt(0)}${last_name.charAt(0)}`.toUpperCase();
}

function isValidNotificationId(notification_id: string | null): notification_id is string {
  return !!notification_id && NOTIFICATION_ID_PATTERN.test(notification_id);
}

export default function NotificationRedirectGate({
  notification_id,
}: NotificationRedirectGateProps) {
  const router = useRouter();
  const [state, setState] = useState<GateState>(() =>
    isValidNotificationId(notification_id) ? { status: "loading" } : { status: "invalid" }
  );
  const [is_impersonating, setIsImpersonating] = useState(false);
  const [impersonate_error, setImpersonateError] = useState<string | null>(null);

  useEffect(() => {
    if (!isValidNotificationId(notification_id)) return;

    async function loadContext() {
      if (!isValidNotificationId(notification_id)) return;

      try {
        const context = await notificationRedirectService.getContext(notification_id);
        setState({ status: "ready", context });
      } catch (err: unknown) {
        const api_error = err as ApiError;
        setState({
          status: "error",
          message:
            api_error.message ||
            "This notification could not be resolved. It may have been removed.",
        });
      }
    }
    loadContext();
  }, [notification_id]);

  function handleReturnToAdmin() {
    router.push(ADMIN_HOME_PATH);
  }

  async function handleImpersonate() {
    if (state.status !== "ready" || !state.context.can_impersonate) return;

    setIsImpersonating(true);
    setImpersonateError(null);
    try {
      const data = await notificationRedirectService.impersonate(state.context.notification_id);
      impersonationService.applyImpersonationResponse(data);
      const destination = getSafeRedirectPath(state.context.redirect_path, "/");
      window.location.href = destination;
    } catch (err: unknown) {
      const api_error = err as ApiError;
      setImpersonateError(
        api_error.message || "Failed to start impersonation. Please try again."
      );
      setIsImpersonating(false);
    }
  }

  if (state.status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (state.status === "invalid" || state.status === "error") {
    const message =
      state.status === "invalid"
        ? "This notification link is missing or malformed."
        : state.message;

    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
        </div>
        <h1 className="text-base font-semibold text-gray-800 dark:text-white/90">
          Unable to resolve this notification
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
        <button
          type="button"
          onClick={handleReturnToAdmin}
          className="mt-2 rounded-xl bg-brand-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
        >
          Return to Admin Side
        </button>
      </div>
    );
  }

  const { context } = state;
  const { target_user } = context;

  return (
    <div className="mx-auto max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-lg dark:border-gray-700 dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-violet-100 bg-violet-50/60 px-6 pb-5 pt-6 dark:border-violet-500/10 dark:bg-violet-500/5">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-violet-700 dark:text-violet-400">
              This Notification Belongs to a Client
            </h1>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              You opened this link while signed in on the admin side. It leads to
              content that only this client account can see directly.
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="space-y-5 px-6 py-5">
        <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-semibold text-teal-700 dark:bg-teal-500/15 dark:text-teal-400">
            {getInitials(target_user.first_name, target_user.last_name)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
              {target_user.first_name} {target_user.last_name}
            </p>
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">
              {target_user.email}
            </p>
          </div>
          <span className="ml-auto shrink-0 inline-flex items-center rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700 ring-1 ring-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:ring-teal-500/20">
            Client Account
          </span>
        </div>

        {context.can_impersonate ? (
          <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-4 dark:border-violet-500/10 dark:bg-violet-500/5">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              To view this exactly as {target_user.first_name} sees it, start an
              impersonation session for their account. Your admin credentials stay
              safely preserved and a banner will remind you the session is active
              until you stop it.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4 dark:border-amber-500/10 dark:bg-amber-500/10">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
              Insufficient permissions
            </p>
            <p className="mt-1 text-sm text-amber-700/90 dark:text-amber-300/90">
              You do not have permission to use the impersonation feature, so this
              notification cannot be opened from the admin side.
            </p>
          </div>
        )}

        {impersonate_error && (
          <p className="text-sm text-error-600 dark:text-error-400">{impersonate_error}</p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4 dark:border-gray-800">
        <button
          type="button"
          onClick={handleReturnToAdmin}
          disabled={is_impersonating}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:bg-transparent dark:text-gray-400 dark:hover:bg-gray-800"
        >
          Return to Admin Side
        </button>
        {context.can_impersonate && (
          <button
            type="button"
            onClick={handleImpersonate}
            disabled={is_impersonating}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:opacity-60 dark:bg-violet-500 dark:hover:bg-violet-600"
          >
            {is_impersonating ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Starting session…
              </>
            ) : (
              "Impersonate & View"
            )}
          </button>
        )}
      </div>
    </div>
  );
}
