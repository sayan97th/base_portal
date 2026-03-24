"use client";

import React, { useState, useEffect, useRef } from "react";
import type { AdminUser } from "@/types/admin";

interface BanUserModalProps {
  user: AdminUser;
  mode: "ban" | "unban";
  is_open: boolean;
  is_loading: boolean;
  onConfirm: (reason?: string) => void;
  onClose: () => void;
}

const AVATAR_COLORS = [
  "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400",
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400",
  "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",
];

function getAvatarColor(user_id: number): string {
  return AVATAR_COLORS[user_id % AVATAR_COLORS.length];
}

function getInitials(first_name: string, last_name: string): string {
  return `${first_name.charAt(0)}${last_name.charAt(0)}`.toUpperCase();
}

const XIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const BanIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
  </svg>
);

const UnbanIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const BanUserModal: React.FC<BanUserModalProps> = ({
  user,
  mode,
  is_open,
  is_loading,
  onConfirm,
  onClose,
}) => {
  const [reason, setReason] = useState("");
  const textarea_ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (is_open) {
      setReason("");
      if (mode === "ban") {
        setTimeout(() => textarea_ref.current?.focus(), 80);
      }
    }
  }, [is_open, mode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !is_loading) onClose();
    };
    if (is_open) document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [is_open, is_loading, onClose]);

  if (!is_open) return null;

  const is_ban = mode === "ban";

  const handleConfirm = () => {
    onConfirm(is_ban ? reason.trim() || undefined : undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={!is_loading ? onClose : undefined}
      />

      {/* Modal card */}
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">

        {/* Close button */}
        <button
          onClick={onClose}
          disabled={is_loading}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        >
          <XIcon />
        </button>

        {/* Header */}
        <div className={`px-6 pt-6 pb-5 ${is_ban ? "border-b border-red-100 bg-red-50/60 dark:border-red-500/10 dark:bg-red-500/5" : "border-b border-emerald-100 bg-emerald-50/60 dark:border-emerald-500/10 dark:bg-emerald-500/5"}`}>
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${is_ban ? "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400" : "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"}`}>
              {is_ban ? <BanIcon /> : <UnbanIcon />}
            </div>
            <div className="min-w-0 pr-6">
              <h2 className={`text-base font-semibold ${is_ban ? "text-red-700 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"}`}>
                {is_ban ? "Disable Account" : "Re-enable Account"}
              </h2>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400 text">
                {is_ban
                  ? "This will immediately revoke the user's access to the platform."
                  : "This will restore full access to the platform for this user."}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* User info */}
          <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${getAvatarColor(user.id)}`}>
              {getInitials(user.first_name, user.last_name)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                {user.first_name} {user.last_name}
              </p>
              <p className="truncate text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
            </div>
            <span className={`ml-auto shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${
              user.is_active
                ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20"
                : "bg-red-50 text-red-600 ring-red-200 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20"
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${user.is_active ? "bg-emerald-500" : "bg-red-500"}`} />
              {user.is_active ? "Active" : "Disabled"}
            </span>
          </div>

          {/* Consequence description */}
          <div className={`rounded-xl p-3.5 text-sm ${is_ban ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"}`}>
            {is_ban ? (
              <ul className="space-y-1 text-left">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0">•</span>
                  <span>The user will be <strong>signed out immediately</strong> from all active sessions.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0">•</span>
                  <span>They will be <strong>unable to sign in</strong> and will see an account-disabled notice.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0">•</span>
                  <span>Their data is preserved and the account can be re-enabled at any time.</span>
                </li>
              </ul>
            ) : (
              <p className="text-left">
                The user will be able to <strong>sign in immediately</strong> and access the platform as usual. All previous data and permissions will be restored.
              </p>
            )}
          </div>

          {/* Reason textarea — ban mode only */}
          {is_ban && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Reason <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span>
              </label>
              <textarea
                ref={textarea_ref}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={is_loading}
                rows={3}
                placeholder="e.g. Violation of Terms of Service — section 4.2 (spam activity)"
                className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 transition-colors focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-200 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:border-red-500 dark:focus:ring-red-500/20"
              />
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Internal note — not visible to the user.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            disabled={is_loading}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:bg-transparent dark:text-gray-400 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={is_loading}
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-medium text-white transition-colors disabled:opacity-60 ${
              is_ban
                ? "bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
                : "bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
            }`}
          >
            {is_loading && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            )}
            {is_loading
              ? is_ban ? "Disabling…" : "Enabling…"
              : is_ban ? "Disable Account" : "Re-enable Account"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BanUserModal;
