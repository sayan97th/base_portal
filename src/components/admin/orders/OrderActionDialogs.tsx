"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminOrder } from "@/types/admin";
import { deleteAdminOrder } from "@/services/admin/order.service";

// ── Actions dropdown ──────────────────────────────────────────────────────────
// Keeps destructive actions tucked away behind an "Actions" menu instead of a
// standalone button in the header, matching the pattern on the invoice detail
// page. Only "Delete" exists today, but the menu is built to hold more items.

export type OrderActionDialog = "delete";

interface ActionsDropdownProps {
  onSelect: (dialog: OrderActionDialog) => void;
}

export function ActionsDropdown({ onSelect }: ActionsDropdownProps) {
  const [open, setOpen] = useState(false);
  const container_ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (container_ref.current && !container_ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const handleSelect = (dialog: OrderActionDialog) => {
    setOpen(false);
    onSelect(dialog);
  };

  const menu_items: { label: string; dialog: OrderActionDialog; danger?: boolean }[] = [
    { label: "Delete Order", dialog: "delete", danger: true },
  ];

  return (
    <div className="relative" ref={container_ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-white/4 dark:text-gray-300 dark:hover:bg-white/[0.07]"
      >
        Actions
        <svg
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-1.5 w-52 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
          {menu_items.map((item) => (
            <button
              key={item.dialog}
              onClick={() => handleSelect(item.dialog)}
              className={`flex w-full items-center px-4 py-2.5 text-sm transition-colors ${
                item.danger
                  ? "text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/10"
                  : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.04]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Shared primitives ─────────────────────────────────────────────────────────
// Mirrors the dialog shell used on the invoice detail page so risky admin
// actions look and behave consistently across the portal.

interface DialogShellProps {
  onClose: () => void;
  children: React.ReactNode;
  max_width?: string;
}

function DialogShell({ onClose, children, max_width = "max-w-lg" }: DialogShellProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative w-full ${max_width} rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900 max-h-[90vh] flex flex-col`}
      >
        {children}
      </div>
    </div>
  );
}

interface DialogHeaderProps {
  title: string;
  onClose: () => void;
  icon?: React.ReactNode;
  variant?: "default" | "danger";
}

function DialogHeader({ title, onClose, icon, variant = "default" }: DialogHeaderProps) {
  const title_class = variant === "danger" ? "text-error-600 dark:text-error-400" : "text-gray-900 dark:text-white";

  return (
    <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
      <div className="flex items-center gap-2.5">
        {icon}
        <h2 className={`text-sm font-semibold ${title_class}`}>{title}</h2>
      </div>
      <button
        onClick={onClose}
        className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

function DialogFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-100 px-6 py-4 dark:border-gray-800">
      {children}
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
      {message}
    </div>
  );
}

// ── Delete Order Dialog ────────────────────────────────────────────────────────

interface DeleteOrderDialogProps {
  order: AdminOrder;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteOrderDialog({ order, onClose, onSuccess }: DeleteOrderDialogProps) {
  const [confirm_input, setConfirmInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const expected_value = order.id.slice(0, 8).toUpperCase();
  const is_confirmed = confirm_input === expected_value;

  const handleDelete = async () => {
    if (!is_confirmed) return;
    setError(null);
    setSubmitting(true);
    try {
      await deleteAdminOrder(order.id);
      onSuccess();
      router.push("/admin/orders");
    } catch {
      setError("Failed to delete the order. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <DialogShell onClose={onClose}>
      <DialogHeader
        title="Delete Order"
        onClose={onClose}
        variant="danger"
        icon={
          <svg className="h-4 w-4 text-error-600 dark:text-error-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        }
      />

      <div className="overflow-y-auto p-6">
        <div className="mb-5 rounded-xl border border-error-200 bg-error-50 p-4 dark:border-error-500/30 dark:bg-error-500/10">
          <div className="flex items-start gap-3">
            <svg className="mt-0.5 h-5 w-5 shrink-0 text-error-600 dark:text-error-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-error-800 dark:text-error-300">This action is permanent and irreversible</p>
              <p className="mt-1 text-xs text-error-700 dark:text-error-400">
                The order and everything tied to it, items, tracking, and reports, will be gone for good. It will no longer be visible to the client or the team.
              </p>
            </div>
          </div>
        </div>

        {(order.invoice || order.session_id) && (
          <ul className="mb-5 space-y-1 rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-600 dark:border-gray-700 dark:bg-white/5 dark:text-gray-400">
            {order.invoice && <li>Its invoice stays in the system, just unlinked from this order.</li>}
            {order.session_id && <li>This order is part of a multi-product purchase, only this order is removed.</li>}
          </ul>
        )}

        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
            <span>Customer</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {order.user.first_name} {order.user.last_name}
            </span>
          </div>
          <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
            <span>Order Title</span>
            <span className="font-medium text-gray-900 dark:text-white">{order.order_title || "Untitled order"}</span>
          </div>
          <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
            <span>Total Amount</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(order.total_amount)}
            </span>
          </div>
        </div>

        <div className="mt-5">
          <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
            Type <span className="font-mono font-semibold text-error-600 dark:text-error-400">{expected_value}</span> to confirm deletion
          </label>
          <input
            type="text"
            value={confirm_input}
            onChange={(e) => setConfirmInput(e.target.value)}
            placeholder={expected_value}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-error-400 focus:outline-none focus:ring-2 focus:ring-error-400/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
          />
        </div>

        {error && <div className="mt-4"><ErrorBanner message={error} /></div>}
      </div>

      <DialogFooter>
        <button
          onClick={onClose}
          disabled={submitting}
          className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          disabled={!is_confirmed || submitting}
          className="inline-flex items-center gap-2 rounded-lg bg-error-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-error-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-error-500 dark:hover:bg-error-400"
        >
          {submitting && (
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          Delete Order
        </button>
      </DialogFooter>
    </DialogShell>
  );
}
