"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  validateAdminInvitationToken,
  acceptAdminInvitation,
} from "@/services/admin/invitation.service";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import type { AdminInvitation } from "@/services/admin/types";
import type { ApiError } from "@/types/auth";

type Props = {
  token: string;
};

type FormState = {
  first_name: string;
  last_name: string;
  password: string;
  password_confirmation: string;
};

export default function AcceptInvitationForm({ token }: Props) {
  const router = useRouter();

  const [invitation, setInvitation] = useState<AdminInvitation | null>(null);
  const [is_validating, setIsValidating] = useState(true);
  const [validation_error, setValidationError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    first_name: "",
    last_name: "",
    password: "",
    password_confirmation: "",
  });
  const [show_password, setShowPassword] = useState(false);
  const [field_errors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [is_submitting, setIsSubmitting] = useState(false);

  // Validate the token on mount
  useEffect(() => {
    const validate = async () => {
      try {
        const result = await validateAdminInvitationToken(token);
        if (result.valid) {
          setInvitation(result.invitation);
        } else {
          setValidationError("This invitation is no longer valid.");
        }
      } catch {
        setValidationError(
          "This invitation link is invalid or has expired. Please request a new one."
        );
      } finally {
        setIsValidating(false);
      }
    };

    validate();
  }, [token]);

  const handleChange =
    (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      await acceptAdminInvitation({
        ...form,
        invitation_token: token,
      });
      router.push("/admin/dashboard");
    } catch (err: unknown) {
      const api_err = err as ApiError;
      if (api_err.errors) setFieldErrors(api_err.errors);
      setError(api_err.message || "Failed to create your account. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────────

  if (is_validating) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Validating your invitation…
        </p>
      </div>
    );
  }

  // ── Invalid / expired invitation ───────────────────────────────────────────

  if (validation_error || !invitation) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-error-50 dark:bg-error-500/10">
          <svg
            className="h-7 w-7 text-error-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Invalid Invitation
        </h2>
        <p className="max-w-sm text-sm text-gray-500 dark:text-gray-400">
          {validation_error}
        </p>
      </div>
    );
  }

  // ── Registration form ──────────────────────────────────────────────────────

  return (
    <div className="flex flex-col flex-1 w-full overflow-y-auto no-scrollbar">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto py-10">
        <div className="mb-6">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 dark:bg-brand-500/10">
            <span className="h-2 w-2 rounded-full bg-brand-500" />
            <span className="text-xs font-medium text-brand-700 dark:text-brand-400">
              Staff Invitation
            </span>
          </div>
          <h1 className="mt-3 text-2xl font-semibold text-gray-900 dark:text-white">
            Complete your account
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            You have been invited to join BASE Search Marketing as{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {invitation.role}
            </span>
            .
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Registering with:{" "}
            <span className="font-medium text-gray-700 dark:text-gray-200">
              {invitation.email}
            </span>
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-error-50 p-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                First Name <span className="text-error-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.first_name}
                onChange={handleChange("first_name")}
                placeholder="John"
                className={`h-11 w-full rounded-lg border px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 ${
                  field_errors.first_name
                    ? "border-error-400 focus:border-error-400"
                    : "border-gray-300 focus:border-brand-400 dark:border-gray-700"
                }`}
              />
              {field_errors.first_name && (
                <p className="mt-1 text-xs text-error-500">
                  {field_errors.first_name[0]}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Last Name <span className="text-error-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.last_name}
                onChange={handleChange("last_name")}
                placeholder="Doe"
                className={`h-11 w-full rounded-lg border px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 ${
                  field_errors.last_name
                    ? "border-error-400 focus:border-error-400"
                    : "border-gray-300 focus:border-brand-400 dark:border-gray-700"
                }`}
              />
              {field_errors.last_name && (
                <p className="mt-1 text-xs text-error-500">
                  {field_errors.last_name[0]}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Password <span className="text-error-500">*</span>
            </label>
            <div className="relative">
              <input
                type={show_password ? "text" : "password"}
                required
                value={form.password}
                onChange={handleChange("password")}
                placeholder="Create a strong password"
                className={`h-11 w-full rounded-lg border px-4 pr-12 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 ${
                  field_errors.password
                    ? "border-error-400 focus:border-error-400"
                    : "border-gray-300 focus:border-brand-400 dark:border-gray-700"
                }`}
              />
              <span
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400"
              >
                {show_password ? (
                  <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                ) : (
                  <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                )}
              </span>
            </div>
            {field_errors.password && (
              <p className="mt-1 text-xs text-error-500">
                {field_errors.password[0]}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Confirm Password <span className="text-error-500">*</span>
            </label>
            <input
              type="password"
              required
              value={form.password_confirmation}
              onChange={handleChange("password_confirmation")}
              placeholder="Repeat your password"
              className={`h-11 w-full rounded-lg border px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 ${
                field_errors.password_confirmation
                  ? "border-error-400 focus:border-error-400"
                  : "border-gray-300 focus:border-brand-400 dark:border-gray-700"
              }`}
            />
            {field_errors.password_confirmation && (
              <p className="mt-1 text-xs text-error-500">
                {field_errors.password_confirmation[0]}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={is_submitting}
            className="flex w-full items-center justify-center rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {is_submitting ? "Creating account…" : "Activate Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
