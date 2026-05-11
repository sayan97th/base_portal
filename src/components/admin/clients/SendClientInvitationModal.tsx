"use client";

import React, { useState, useEffect, useRef } from "react";
import { sendClientInvitation } from "@/services/admin/client-invitation.service";
import type { ClientInvitation } from "@/types/admin";
import type { ApiError } from "@/types/auth";

interface SendClientInvitationModalProps {
  is_open: boolean;
  onClose: () => void;
  onSuccess: (invitation: ClientInvitation) => void;
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const SendClientInvitationModal: React.FC<SendClientInvitationModalProps> = ({
  is_open,
  onClose,
  onSuccess,
}) => {
  const [email, setEmail] = useState("");
  const [is_loading, setIsLoading] = useState(false);
  const [email_error, setEmailError] = useState<string | undefined>();
  const [general_error, setGeneralError] = useState<string | null>(null);
  const [success_email, setSuccessEmail] = useState<string | null>(null);

  const email_ref = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (is_open) {
      setEmail("");
      setIsLoading(false);
      setEmailError(undefined);
      setGeneralError(null);
      setSuccessEmail(null);
      setTimeout(() => email_ref.current?.focus(), 80);
    }
  }, [is_open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !is_loading) onClose();
    };
    if (is_open) document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [is_open, is_loading, onClose]);

  if (!is_open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmed = email.trim();
    if (!trimmed) {
      setEmailError("Email address is required.");
      return;
    }
    if (!validateEmail(trimmed)) {
      setEmailError("Enter a valid email address.");
      return;
    }

    setEmailError(undefined);
    setGeneralError(null);
    setIsLoading(true);

    try {
      const invitation = await sendClientInvitation({ email: trimmed });
      setSuccessEmail(trimmed);
      setTimeout(() => {
        onSuccess(invitation);
      }, 1200);
    } catch (err: unknown) {
      const api_error = err as ApiError;
      if (api_error.errors?.email) {
        setEmailError(api_error.errors.email[0]);
      } else {
        setGeneralError(api_error.message || "Something went wrong. Please try again.");
      }
      setIsLoading(false);
    }
  }

  const is_success = !!success_email;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={!is_loading && !is_success ? onClose : undefined}
      />

      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
        <button
          onClick={onClose}
          disabled={is_loading}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="border-b border-teal-100 bg-gradient-to-br from-teal-50 to-emerald-50/50 px-6 pb-5 pt-6 dark:border-teal-500/10 dark:from-teal-500/5 dark:to-emerald-500/3">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-600 dark:bg-teal-500/15 dark:text-teal-400">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
            </div>
            <div className="min-w-0 pr-8">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Send Client Invitation
              </h2>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                The client will receive an email with a link to set up their account. Invitation expires in 7 days.
              </p>
            </div>
          </div>
        </div>

        {/* Success state */}
        {is_success ? (
          <div className="flex flex-col items-center gap-4 px-6 py-14">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Invitation sent!</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                An invitation email has been sent to <span className="font-medium text-gray-700 dark:text-gray-300">{success_email}</span>.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="space-y-4 px-6 py-5">
              {general_error && (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
                  {general_error}
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    ref={email_ref}
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError(undefined);
                    }}
                    disabled={is_loading}
                    placeholder="client@example.com"
                    autoComplete="email"
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 transition-colors focus:outline-none focus:ring-2 disabled:opacity-60 dark:text-white dark:placeholder-gray-500 ${
                      email_error
                        ? "border-red-300 bg-white focus:border-red-400 focus:ring-red-200 dark:border-red-500/50 dark:bg-gray-800 dark:focus:ring-red-500/20"
                        : "border-gray-200 bg-white focus:border-teal-400 focus:ring-teal-200 dark:border-gray-700 dark:bg-gray-800 dark:focus:border-teal-500 dark:focus:ring-teal-500/20"
                    }`}
                  />
                  {email_error && (
                    <p className="mt-1 text-xs text-red-500 dark:text-red-400">{email_error}</p>
                  )}
                </div>
              </div>

              {/* Info box */}
              <div className="rounded-xl border border-teal-100 bg-teal-50/60 px-4 py-3 dark:border-teal-500/10 dark:bg-teal-500/5">
                <div className="flex items-start gap-2.5">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-teal-500 dark:text-teal-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                  </svg>
                  <p className="text-xs text-teal-700 dark:text-teal-400">
                    The client will receive a secure link to create their account. The invitation is valid for <strong>7 days</strong> and can be resent at any time.
                  </p>
                </div>
              </div>
            </div>

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
                type="submit"
                disabled={is_loading}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:opacity-60 dark:bg-teal-500 dark:hover:bg-teal-600"
              >
                {is_loading && (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                )}
                {is_loading ? "Sending…" : "Send Invitation"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default SendClientInvitationModal;
