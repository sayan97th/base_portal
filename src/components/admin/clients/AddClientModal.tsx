"use client";

import React, { useState, useEffect, useRef } from "react";
import { createAdminClient } from "@/services/admin/user.service";
import type { AdminUser, CreateClientPayload } from "@/types/admin";
import type { ApiError } from "@/types/auth";

interface AddClientModalProps {
  is_open: boolean;
  onClose: () => void;
  onSuccess: (client: AdminUser) => void;
}

interface FormErrors {
  first_name?: string;
  last_name?: string;
  email?: string;
  password?: string;
  general?: string;
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function generatePassword(): string {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const symbols = "!@#%^&*";
  const all = upper + lower + digits + symbols;

  const random = new Uint32Array(12);
  crypto.getRandomValues(random);

  const chars: string[] = [
    upper[random[0] % upper.length],
    lower[random[1] % lower.length],
    digits[random[2] % digits.length],
    symbols[random[3] % symbols.length],
  ];
  for (let i = 4; i < 12; i++) {
    chars.push(all[random[i] % all.length]);
  }

  // Fisher-Yates shuffle
  const shuffle = new Uint32Array(chars.length);
  crypto.getRandomValues(shuffle);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = shuffle[i] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-200 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-teal-500/20 dark:focus:ring-offset-gray-900 ${
        checked ? "bg-teal-500 dark:bg-teal-400" : "bg-gray-200 dark:bg-gray-700"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function EyeIcon({ visible }: { visible: boolean }) {
  if (visible) {
    return (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
      </svg>
    );
  }
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

function FieldInput({
  id,
  type = "text",
  value,
  onChange,
  disabled,
  placeholder,
  error,
  autoComplete,
  right_slot,
  input_ref,
}: {
  id?: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  error?: string;
  autoComplete?: string;
  right_slot?: React.ReactNode;
  input_ref?: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="relative">
      <input
        id={id}
        ref={input_ref as React.RefObject<HTMLInputElement>}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 transition-colors focus:outline-none focus:ring-2 disabled:opacity-60 dark:text-white dark:placeholder-gray-500 ${
          right_slot ? "pr-11" : ""
        } ${
          error
            ? "border-red-300 bg-white focus:border-red-400 focus:ring-red-200 dark:border-red-500/50 dark:bg-gray-800 dark:focus:ring-red-500/20"
            : "border-gray-200 bg-white focus:border-teal-400 focus:ring-teal-200 dark:border-gray-700 dark:bg-gray-800 dark:focus:border-teal-500 dark:focus:ring-teal-500/20"
        }`}
      />
      {right_slot && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">{right_slot}</div>
      )}
      {error && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{error}</p>}
    </div>
  );
}

const AddClientModal: React.FC<AddClientModalProps> = ({ is_open, onClose, onSuccess }) => {
  const [first_name, setFirstName] = useState("");
  const [last_name, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [set_password, setSetPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [show_password, setShowPassword] = useState(false);
  const [send_welcome_email, setSendWelcomeEmail] = useState(true);
  const [is_loading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [success_message, setSuccessMessage] = useState<string | null>(null);

  const first_name_ref = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (is_open) {
      setFirstName("");
      setLastName("");
      setEmail("");
      setSetPassword(false);
      setPassword("");
      setShowPassword(false);
      setSendWelcomeEmail(true);
      setIsLoading(false);
      setErrors({});
      setSuccessMessage(null);
      setTimeout(() => first_name_ref.current?.focus(), 80);
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

  function validate(): FormErrors {
    const errs: FormErrors = {};
    if (!first_name.trim()) errs.first_name = "First name is required.";
    if (!last_name.trim()) errs.last_name = "Last name is required.";
    if (!email.trim()) {
      errs.email = "Email address is required.";
    } else if (!validateEmail(email.trim())) {
      errs.email = "Enter a valid email address.";
    }
    if (set_password && password.length < 8) {
      errs.password = "Password must be at least 8 characters.";
    }
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setIsLoading(true);

    const payload: CreateClientPayload = {
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      email: email.trim(),
      send_welcome_email,
    };
    if (set_password && password) {
      payload.password = password;
    }

    try {
      const response = await createAdminClient(payload);
      setSuccessMessage(response.message || "Client created successfully.");
      setTimeout(() => {
        onSuccess(response.user);
      }, 1000);
    } catch (err: unknown) {
      const api_error = err as ApiError;
      if (api_error.errors) {
        const field_errors: FormErrors = {};
        if (api_error.errors.first_name) field_errors.first_name = api_error.errors.first_name[0];
        if (api_error.errors.last_name) field_errors.last_name = api_error.errors.last_name[0];
        if (api_error.errors.email) field_errors.email = api_error.errors.email[0];
        if (api_error.errors.password) field_errors.password = api_error.errors.password[0];
        setErrors(field_errors);
      } else {
        setErrors({ general: api_error.message || "Something went wrong. Please try again." });
      }
      setIsLoading(false);
    }
  }

  const is_success = !!success_message;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={!is_loading && !is_success ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">

        {/* Close button */}
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM4 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 10.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
              </svg>
            </div>
            <div className="min-w-0 pr-8">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Add New Client
              </h2>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                Create a client account and optionally send a welcome email.
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
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{success_message}</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                The client account has been created.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="space-y-4 px-6 py-5">

              {/* General API error */}
              {errors.general && (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
                  {errors.general}
                </div>
              )}

              {/* Name row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <FieldInput
                    input_ref={first_name_ref}
                    value={first_name}
                    onChange={(v) => { setFirstName(v); setErrors((p) => ({ ...p, first_name: undefined })); }}
                    disabled={is_loading}
                    placeholder="Jane"
                    error={errors.first_name}
                    autoComplete="given-name"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <FieldInput
                    value={last_name}
                    onChange={(v) => { setLastName(v); setErrors((p) => ({ ...p, last_name: undefined })); }}
                    disabled={is_loading}
                    placeholder="Doe"
                    error={errors.last_name}
                    autoComplete="family-name"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <FieldInput
                  type="email"
                  value={email}
                  onChange={(v) => { setEmail(v); setErrors((p) => ({ ...p, email: undefined })); }}
                  disabled={is_loading}
                  placeholder="jane@example.com"
                  error={errors.email}
                  autoComplete="email"
                />
              </div>

              {/* Section divider */}
              <div className="flex items-center gap-3 pt-1">
                <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
                <span className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Account Setup
                </span>
                <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
              </div>

              {/* Temporary password toggle */}
              <div className="rounded-xl border border-gray-100 p-4 dark:border-gray-800">
                <div className="flex items-start gap-3">
                  <Toggle
                    checked={set_password}
                    onChange={() => {
                      setSetPassword((v) => !v);
                      setPassword("");
                      setErrors((p) => ({ ...p, password: undefined }));
                    }}
                    disabled={is_loading}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Set a temporary password
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                      {set_password
                        ? "Client can sign in immediately with this password."
                        : "Client will set their own password via the welcome email."}
                    </p>

                    {set_password && (
                      <div className="mt-3 space-y-2">
                        <FieldInput
                          type={show_password ? "text" : "password"}
                          value={password}
                          onChange={(v) => { setPassword(v); setErrors((p) => ({ ...p, password: undefined })); }}
                          disabled={is_loading}
                          placeholder="Minimum 8 characters"
                          error={errors.password}
                          autoComplete="new-password"
                          right_slot={
                            <button
                              type="button"
                              onClick={() => setShowPassword((v) => !v)}
                              className="text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
                            >
                              <EyeIcon visible={show_password} />
                            </button>
                          }
                        />
                        <div className="flex justify-end">
                          <button
                            type="button"
                            disabled={is_loading}
                            onClick={() => {
                              const generated = generatePassword();
                              setPassword(generated);
                              setShowPassword(true);
                              setErrors((p) => ({ ...p, password: undefined }));
                            }}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-600 transition-colors hover:text-teal-700 disabled:opacity-40 dark:text-teal-400 dark:hover:text-teal-300"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                            </svg>
                            Generate password
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Welcome email toggle */}
              <div className="rounded-xl border border-gray-100 p-4 dark:border-gray-800">
                <div className="flex items-start gap-3">
                  <Toggle
                    checked={send_welcome_email}
                    onChange={() => setSendWelcomeEmail((v) => !v)}
                    disabled={is_loading}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Send welcome email
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                      Client receives an email with instructions to access their account.
                    </p>
                  </div>
                </div>
              </div>

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
                type="submit"
                disabled={is_loading}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:opacity-60 dark:bg-teal-500 dark:hover:bg-teal-600"
              >
                {is_loading && (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                )}
                {is_loading ? "Creating…" : "Add Client"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AddClientModal;
