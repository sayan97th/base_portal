"use client";

import React, { useState, useEffect, useRef } from "react";
import type { CreateOrderUpdatePayload } from "@/types/admin";
import type { OrderStatus } from "@/types/admin";

interface AddOrderUpdateModalProps {
  is_open: boolean;
  is_submitting: boolean;
  current_status: OrderStatus;
  onClose: () => void;
  onSubmit: (payload: CreateOrderUpdatePayload) => Promise<void>;
}

const STATUS_OPTIONS: { value: OrderStatus; label: string; color: string }[] = [
  { value: "pending", label: "Pending", color: "text-warning-600 dark:text-warning-400" },
  { value: "processing", label: "Processing", color: "text-blue-600 dark:text-blue-400" },
  { value: "completed", label: "Completed", color: "text-success-600 dark:text-success-400" },
  { value: "cancelled", label: "Cancelled", color: "text-error-600 dark:text-error-400" },
];

const XIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const MailIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
  </svg>
);

const AddOrderUpdateModal: React.FC<AddOrderUpdateModalProps> = ({
  is_open,
  is_submitting,
  current_status,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [status_change, setStatusChange] = useState<OrderStatus | "">(current_status);
  const [send_email, setSendEmail] = useState(true);
  const [errors, setErrors] = useState<{ title?: string; message?: string }>({});

  const title_ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (is_open) {
      setTitle("");
      setMessage("");
      setStatusChange(current_status);
      setSendEmail(true);
      setErrors({});
      setTimeout(() => title_ref.current?.focus(), 100);
    }
  }, [is_open, current_status]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && is_open && !is_submitting) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [is_open, is_submitting, onClose]);

  function validate(): boolean {
    const new_errors: { title?: string; message?: string } = {};
    if (!title.trim()) new_errors.title = "Title is required.";
    if (!message.trim()) new_errors.message = "Message is required.";
    setErrors(new_errors);
    return Object.keys(new_errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit({
      title: title.trim(),
      message: message.trim(),
      status_change: (status_change as OrderStatus) || null,
      send_email,
    });
  }

  if (!is_open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !is_submitting && onClose()}
      />

      {/* Modal Panel */}
      <div className="relative z-10 w-full max-w-lg rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl dark:bg-gray-900 dark:shadow-black/40">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Add Order Update
            </h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Post a progress update and optionally notify the client.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={is_submitting}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <XIcon />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {/* Title */}
          <div>
            <label
              htmlFor="update-title"
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Update Title <span className="text-error-500">*</span>
            </label>
            <input
              ref={title_ref}
              id="update-title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
              }}
              placeholder="e.g. Link placements in progress"
              disabled={is_submitting}
              className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:opacity-60 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 ${
                errors.title
                  ? "border-error-400 focus:border-error-400 dark:border-error-500"
                  : "border-gray-200 focus:border-brand-400 dark:border-gray-700"
              }`}
            />
            {errors.title && (
              <p className="mt-1 text-xs text-error-600 dark:text-error-400">{errors.title}</p>
            )}
          </div>

          {/* Message */}
          <div>
            <label
              htmlFor="update-message"
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Message <span className="text-error-500">*</span>
            </label>
            <textarea
              id="update-message"
              rows={4}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                if (errors.message) setErrors((prev) => ({ ...prev, message: undefined }));
              }}
              placeholder="Describe what's happening with this order..."
              disabled={is_submitting}
              className={`w-full resize-none rounded-lg border px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:opacity-60 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 ${
                errors.message
                  ? "border-error-400 focus:border-error-400 dark:border-error-500"
                  : "border-gray-200 focus:border-brand-400 dark:border-gray-700"
              }`}
            />
            {errors.message && (
              <p className="mt-1 text-xs text-error-600 dark:text-error-400">{errors.message}</p>
            )}
          </div>

          {/* Status Change */}
          <div>
            <label
              htmlFor="status-change"
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Change Order Status{" "}
              <span className="text-xs font-normal text-gray-400">(optional)</span>
            </label>
            <select
              id="status-change"
              value={status_change}
              onChange={(e) => setStatusChange(e.target.value as OrderStatus | "")}
              disabled={is_submitting}
              className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 transition-colors focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                  {opt.value === current_status ? " (current)" : ""}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Leave as-is to keep the current status unchanged.
            </p>
          </div>

          {/* Send Email Toggle */}
          <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/50">
            <div className="flex h-5 items-center">
              <input
                id="send-email"
                type="checkbox"
                checked={send_email}
                onChange={(e) => setSendEmail(e.target.checked)}
                disabled={is_submitting}
                className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 disabled:opacity-60 dark:border-gray-600"
              />
            </div>
            <label htmlFor="send-email" className="cursor-pointer">
              <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                <MailIcon />
                Notify client via email
              </div>
              <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                Send an email to the client with this update so they know their order is progressing.
              </p>
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={is_submitting}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-transparent dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={is_submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-60"
            >
              {is_submitting ? (
                <>
                  <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Posting...
                </>
              ) : (
                "Post Update"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddOrderUpdateModal;
