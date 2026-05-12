"use client";

import React, { useEffect, useRef, useState } from "react";
import type { AdminUser } from "@/types/admin";
import { resendClientWelcomeEmail } from "@/services/admin/user.service";

interface ClientActionsDropdownProps {
  client: AdminUser;
}

export default function ClientActionsDropdown({ client }: ClientActionsDropdownProps) {
  const [is_open, setIsOpen] = useState(false);
  const [is_sending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const container_ref = useRef<HTMLDivElement>(null);

  const can_resend = client.last_login_at === null;

  useEffect(() => {
    if (!is_open) return;
    function handleClickOutside(e: MouseEvent) {
      if (container_ref.current && !container_ref.current.contains(e.target as Node)) {
        setIsOpen(false);
        setFeedback(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [is_open]);

  async function handleResendWelcomeEmail() {
    if (!can_resend || is_sending) return;
    setIsSending(true);
    setFeedback(null);
    try {
      await resendClientWelcomeEmail(client.id);
      setFeedback({ type: "success", message: "Welcome email sent successfully." });
    } catch {
      setFeedback({ type: "error", message: "Failed to send the email. Please try again." });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div ref={container_ref} className="relative">
      <button
        onClick={() => { setIsOpen((o) => !o); setFeedback(null); }}
        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-xs transition-colors hover:bg-gray-50 hover:text-gray-700 dark:border-gray-700 dark:bg-white/3 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200"
        aria-label="More actions"
        aria-expanded={is_open}
        aria-haspopup="true"
        title="More actions"
      >
        <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 16 16">
          <circle cx="8" cy="2.5" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="8" cy="13.5" r="1.5" />
        </svg>
      </button>

      {is_open && (
        <div className="absolute right-0 z-50 mt-1.5 w-56 rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
          {/* Resend Welcome Email */}
          <button
            onClick={handleResendWelcomeEmail}
            disabled={!can_resend || is_sending}
            className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs transition-colors ${
              can_resend && !is_sending
                ? "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5"
                : "cursor-not-allowed text-gray-400 dark:text-gray-600"
            }`}
            title={
              !can_resend
                ? "This client has already logged in"
                : "Resend welcome email to this client"
            }
          >
            <svg
              className={`h-3.5 w-3.5 shrink-0 ${
                can_resend && !is_sending
                  ? "text-gray-500 dark:text-gray-400"
                  : "text-gray-400 dark:text-gray-600"
              }`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
              />
            </svg>
            <span>
              {is_sending ? "Sending…" : "Resend Welcome Email"}
            </span>
            {!can_resend && (
              <span className="ml-auto rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 dark:bg-gray-800 dark:text-gray-600">
                Logged in
              </span>
            )}
          </button>

          {/* Inline feedback */}
          {feedback && (
            <div
              className={`mx-2 mb-1 mt-0.5 rounded-lg px-2.5 py-1.5 text-xs ${
                feedback.type === "success"
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                  : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
              }`}
            >
              {feedback.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
