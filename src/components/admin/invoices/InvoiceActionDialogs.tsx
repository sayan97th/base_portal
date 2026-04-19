"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminInvoice } from "@/types/admin";
import {
  emailAdminInvoice,
  updateAdminInvoice,
  updateAdminInvoiceBilling,
  markAdminInvoiceAsPaid,
  duplicateAdminInvoice,
  deleteAdminInvoice,
  voidAdminInvoice,
  type UpdateInvoiceBillingPayload,
} from "@/services/admin/invoice.service";
import type { CreateInvoiceLineItemPayload } from "@/types/admin";

// ── Shared primitives ─────────────────────────────────────────────────────────

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
  variant?: "default" | "danger" | "warning";
}

function DialogHeader({ title, onClose, icon, variant = "default" }: DialogHeaderProps) {
  const title_class =
    variant === "danger"
      ? "text-error-600 dark:text-error-400"
      : variant === "warning"
      ? "text-warning-600 dark:text-warning-400"
      : "text-gray-900 dark:text-white";

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

interface DialogFooterProps {
  children: React.ReactNode;
}

function DialogFooter({ children }: DialogFooterProps) {
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

// ── Email Invoice Dialog ───────────────────────────────────────────────────────

interface EmailInvoiceDialogProps {
  invoice: AdminInvoice;
  onClose: () => void;
}

export function EmailInvoiceDialog({ invoice, onClose }: EmailInvoiceDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const customer_name = `${invoice.user.first_name} ${invoice.user.last_name}`;

  const handleSend = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await emailAdminInvoice(invoice.id);
      setSuccess(true);
    } catch {
      setError("Failed to send the reminder email. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DialogShell onClose={onClose}>
      <DialogHeader
        title="Send Invoice Reminder"
        onClose={onClose}
        icon={
          <svg className="h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        }
      />

      <div className="overflow-y-auto p-6">
        {success ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-100 dark:bg-success-500/15">
              <svg className="h-6 w-6 text-success-600 dark:text-success-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Reminder sent successfully</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                The invoice reminder email was sent to <span className="font-medium">{customer_name}</span>.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              An unpaid invoice reminder email will be sent to the customer below.
            </p>

            {/* Recipient */}
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.02]">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Recipient</p>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-400">
                  {invoice.user.first_name.charAt(0).toUpperCase()}
                  {invoice.user.last_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{customer_name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{invoice.user.email}</p>
                </div>
              </div>
            </div>

            {/* Invoice reference */}
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.02]">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Invoice</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Invoice Number</span>
                <span className="font-mono font-medium text-gray-900 dark:text-white">{invoice.invoice_number}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Amount</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(invoice.total_amount)}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl border border-brand-200 bg-brand-50 p-3.5 dark:border-brand-500/30 dark:bg-brand-500/10">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
              <p className="text-xs text-brand-700 dark:text-brand-300">
                The unpaid invoice notification email will be sent. The customer will receive a payment link to settle the invoice.
              </p>
            </div>

            {error && <ErrorBanner message={error} />}
          </div>
        )}
      </div>

      <DialogFooter>
        {success ? (
          <button
            onClick={onClose}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Close
          </button>
        ) : (
          <>
            <button
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50 dark:bg-brand-500 dark:hover:bg-brand-400"
            >
              {submitting && (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              Send Reminder
            </button>
          </>
        )}
      </DialogFooter>
    </DialogShell>
  );
}

// ── Edit Invoice Dialog ────────────────────────────────────────────────────────

interface LocalLineItem {
  local_id: string;
  item_name: string;
  price: string;
  quantity: string;
}

let item_id_counter = 0;
function newLocalId(): string {
  return `li_${++item_id_counter}_${Date.now()}`;
}

interface EditInvoiceDialogProps {
  invoice: AdminInvoice;
  onClose: () => void;
  onSuccess: (updated: AdminInvoice) => void;
}

export function EditInvoiceDialog({ invoice, onClose, onSuccess }: EditInvoiceDialogProps) {
  const [date_due, setDateDue] = useState(invoice.date_due ?? "");
  const [line_items, setLineItems] = useState<LocalLineItem[]>(
    invoice.line_items.length > 0
      ? invoice.line_items.map((li) => ({
          local_id: newLocalId(),
          item_name: li.item_name,
          price: String(li.price),
          quantity: String(li.quantity),
        }))
      : [{ local_id: newLocalId(), item_name: "", price: "", quantity: "1" }]
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addLineItem = () => {
    setLineItems((prev) => [...prev, { local_id: newLocalId(), item_name: "", price: "", quantity: "1" }]);
  };

  const removeLineItem = (local_id: string) => {
    setLineItems((prev) => prev.filter((li) => li.local_id !== local_id));
  };

  const updateLineItem = (local_id: string, field: keyof Omit<LocalLineItem, "local_id">, value: string) => {
    setLineItems((prev) =>
      prev.map((li) => (li.local_id === local_id ? { ...li, [field]: value } : li))
    );
  };

  const calcItemTotal = (li: LocalLineItem): number => {
    const price = parseFloat(li.price) || 0;
    const qty = Math.max(1, parseInt(li.quantity) || 1);
    return price * qty;
  };

  const subtotal = line_items.reduce((s, li) => s + calcItemTotal(li), 0);

  const handleSubmit = async () => {
    setError(null);
    const valid_items = line_items.filter((li) => li.item_name.trim());
    if (valid_items.length === 0) {
      setError("Please add at least one line item with a name.");
      return;
    }
    setSubmitting(true);
    try {
      const payload_items: CreateInvoiceLineItemPayload[] = valid_items.map((li) => ({
        item_name: li.item_name.trim(),
        price: parseFloat(li.price) || 0,
        quantity: Math.max(1, parseInt(li.quantity) || 1),
      }));
      const updated = await updateAdminInvoice(invoice.id, {
        date_due: date_due || undefined,
        line_items: payload_items,
      });
      onSuccess(updated);
    } catch {
      setError("Failed to update invoice. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DialogShell onClose={onClose} max_width="max-w-2xl">
      <DialogHeader
        title="Edit Invoice"
        onClose={onClose}
        icon={
          <svg className="h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
          </svg>
        }
      />

      <div className="overflow-y-auto p-6">
        <div className="space-y-6">
          {/* Due date */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
              Due Date
            </label>
            <input
              type="date"
              value={date_due}
              onChange={(e) => setDateDue(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          {/* Line items */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Line Items</label>
              <button
                onClick={addLineItem}
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add item
              </button>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-white/[0.02]">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Item Name</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Unit Price</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Qty</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">Total</th>
                    <th className="w-8 px-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {line_items.map((li) => (
                    <tr key={li.local_id}>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={li.item_name}
                          onChange={(e) => updateLineItem(li.local_id, "item_name", e.target.value)}
                          placeholder="Item description"
                          className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-900 placeholder-gray-400 focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={li.price}
                          onChange={(e) => updateLineItem(li.local_id, "price", e.target.value)}
                          placeholder="0.00"
                          className="w-24 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-900 placeholder-gray-400 focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={li.quantity}
                          onChange={(e) => updateLineItem(li.local_id, "quantity", e.target.value)}
                          className="w-16 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-900 focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        />
                      </td>
                      <td className="px-4 py-2 text-right text-xs text-gray-600 dark:text-gray-400">
                        {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(calcItemTotal(li))}
                      </td>
                      <td className="px-2 py-2">
                        <button
                          onClick={() => removeLineItem(li.local_id)}
                          disabled={line_items.length === 1}
                          className="flex h-6 w-6 items-center justify-center rounded text-gray-400 transition-colors hover:bg-error-50 hover:text-error-500 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-error-500/10 dark:hover:text-error-400"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-end border-t border-gray-100 px-4 py-2.5 dark:border-gray-800">
                <span className="text-xs text-gray-500 dark:text-gray-400">Subtotal</span>
                <span className="ml-4 text-sm font-semibold text-gray-900 dark:text-white">
                  {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(subtotal)}
                </span>
              </div>
            </div>
          </div>

          {error && <ErrorBanner message={error} />}
        </div>
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
          onClick={handleSubmit}
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50 dark:bg-brand-500 dark:hover:bg-brand-400"
        >
          {submitting && (
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          Save Changes
        </button>
      </DialogFooter>
    </DialogShell>
  );
}

// ── Edit Billing Details Dialog ───────────────────────────────────────────────

interface EditBillingDetailsDialogProps {
  invoice: AdminInvoice;
  onClose: () => void;
  onSuccess: (updated: AdminInvoice) => void;
}

export function EditBillingDetailsDialog({ invoice, onClose, onSuccess }: EditBillingDetailsDialogProps) {
  const billed = invoice.billed_to;
  const [form, setForm] = useState<UpdateInvoiceBillingPayload>({
    company_name: billed?.company_name ?? "",
    company_description: billed?.company_description ?? "",
    address_line_1: billed?.address_line_1 ?? "",
    address_line_2: billed?.address_line_2 ?? "",
    state: billed?.state ?? "",
    country: billed?.country ?? "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = (field: keyof UpdateInvoiceBillingPayload, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value || null }));
  };

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const updated = await updateAdminInvoiceBilling(invoice.id, form);
      onSuccess(updated);
    } catch {
      setError("Failed to update billing details. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const field_class =
    "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500";
  const label_class = "mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300";

  return (
    <DialogShell onClose={onClose}>
      <DialogHeader
        title="Edit Billing Details"
        onClose={onClose}
        icon={
          <svg className="h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
          </svg>
        }
      />

      <div className="overflow-y-auto p-6">
        <div className="space-y-4">
          <div>
            <label className={label_class}>Company Name</label>
            <input
              type="text"
              value={form.company_name ?? ""}
              onChange={(e) => updateField("company_name", e.target.value)}
              placeholder="Acme Corp"
              className={field_class}
            />
          </div>
          <div>
            <label className={label_class}>Company Description</label>
            <input
              type="text"
              value={form.company_description ?? ""}
              onChange={(e) => updateField("company_description", e.target.value)}
              placeholder="e.g. Technology Services"
              className={field_class}
            />
          </div>
          <div>
            <label className={label_class}>Address Line 1</label>
            <input
              type="text"
              value={form.address_line_1 ?? ""}
              onChange={(e) => updateField("address_line_1", e.target.value)}
              placeholder="123 Main Street"
              className={field_class}
            />
          </div>
          <div>
            <label className={label_class}>Address Line 2</label>
            <input
              type="text"
              value={form.address_line_2 ?? ""}
              onChange={(e) => updateField("address_line_2", e.target.value)}
              placeholder="Suite 100"
              className={field_class}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label_class}>State / Province</label>
              <input
                type="text"
                value={form.state ?? ""}
                onChange={(e) => updateField("state", e.target.value)}
                placeholder="Utah"
                className={field_class}
              />
            </div>
            <div>
              <label className={label_class}>Country</label>
              <input
                type="text"
                value={form.country ?? ""}
                onChange={(e) => updateField("country", e.target.value)}
                placeholder="United States"
                className={field_class}
              />
            </div>
          </div>

          {error && <ErrorBanner message={error} />}
        </div>
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
          onClick={handleSubmit}
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50 dark:bg-brand-500 dark:hover:bg-brand-400"
        >
          {submitting && (
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          Save Changes
        </button>
      </DialogFooter>
    </DialogShell>
  );
}

// ── Mark as Paid Dialog ───────────────────────────────────────────────────────

interface MarkAsPaidDialogProps {
  invoice: AdminInvoice;
  onClose: () => void;
  onSuccess: (updated: AdminInvoice) => void;
}

export function MarkAsPaidDialog({ invoice, onClose, onSuccess }: MarkAsPaidDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const customer_name = `${invoice.user.first_name} ${invoice.user.last_name}`;

  const handleConfirm = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const updated = await markAdminInvoiceAsPaid(invoice.id);
      onSuccess(updated);
    } catch {
      setError("Failed to mark invoice as paid. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DialogShell onClose={onClose}>
      <DialogHeader
        title="Mark as Paid"
        onClose={onClose}
        icon={
          <svg className="h-4 w-4 text-success-600 dark:text-success-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
          </svg>
        }
      />

      <div className="p-6">
        <div className="mb-5 flex items-center gap-4 rounded-xl border border-success-200 bg-success-50 p-4 dark:border-success-500/30 dark:bg-success-500/10">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success-100 dark:bg-success-500/20">
            <svg className="h-5 w-5 text-success-600 dark:text-success-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-success-800 dark:text-success-300">Confirm payment received</p>
            <p className="mt-0.5 text-xs text-success-700 dark:text-success-400">
              This will mark invoice <span className="font-mono font-semibold">{invoice.invoice_number}</span> as paid and set the payment date to today.
            </p>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 dark:text-gray-400">Customer</span>
            <span className="font-medium text-gray-900 dark:text-white">{customer_name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500 dark:text-gray-400">Invoice Amount</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(invoice.total_amount)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500 dark:text-gray-400">Current Status</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-error-50 px-2.5 py-0.5 text-xs font-medium text-error-700 dark:bg-error-500/15 dark:text-error-400">
              <span className="h-1.5 w-1.5 rounded-full bg-error-500" />
              Unpaid
            </span>
          </div>
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
          onClick={handleConfirm}
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-lg bg-success-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-success-700 disabled:opacity-50 dark:bg-success-500 dark:hover:bg-success-400"
        >
          {submitting && (
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          Mark as Paid
        </button>
      </DialogFooter>
    </DialogShell>
  );
}

// ── Duplicate Invoice Dialog ──────────────────────────────────────────────────

interface DuplicateInvoiceDialogProps {
  invoice: AdminInvoice;
  onClose: () => void;
  onSuccess: (duplicated: AdminInvoice) => void;
}

export function DuplicateInvoiceDialog({ invoice, onClose, onSuccess }: DuplicateInvoiceDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleConfirm = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const duplicated = await duplicateAdminInvoice(invoice.id);
      onSuccess(duplicated);
      router.push(`/admin/invoices/${duplicated.id}`);
    } catch {
      setError("Failed to duplicate the invoice. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <DialogShell onClose={onClose}>
      <DialogHeader
        title="Duplicate Invoice"
        onClose={onClose}
        icon={
          <svg className="h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
          </svg>
        }
      />

      <div className="p-6">
        <div className="mb-5 space-y-3 text-sm text-gray-600 dark:text-gray-400">
          <p>
            A new copy of invoice <span className="font-mono font-semibold text-gray-900 dark:text-white">{invoice.invoice_number}</span> will be created with:
          </p>
          <ul className="ml-4 space-y-1.5">
            {[
              "The same line items and billing details",
              "The same customer assignment",
              "An unpaid status and no payment date",
              "A new invoice number and creation date",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <svg className="h-3.5 w-3.5 shrink-0 text-brand-500 dark:text-brand-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            You will be redirected to the new invoice after duplication.
          </p>
        </div>

        {error && <ErrorBanner message={error} />}
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
          onClick={handleConfirm}
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50 dark:bg-brand-500 dark:hover:bg-brand-400"
        >
          {submitting && (
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          Duplicate Invoice
        </button>
      </DialogFooter>
    </DialogShell>
  );
}

// ── Delete Invoice Dialog ─────────────────────────────────────────────────────

interface DeleteInvoiceDialogProps {
  invoice: AdminInvoice;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteInvoiceDialog({ invoice, onClose, onSuccess }: DeleteInvoiceDialogProps) {
  const [confirm_input, setConfirmInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const expected_value = invoice.invoice_number;
  const is_confirmed = confirm_input === expected_value;

  const handleDelete = async () => {
    if (!is_confirmed) return;
    setError(null);
    setSubmitting(true);
    try {
      await deleteAdminInvoice(invoice.id);
      onSuccess();
      router.push("/admin/invoices");
    } catch {
      setError("Failed to delete the invoice. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <DialogShell onClose={onClose}>
      <DialogHeader
        title="Delete Invoice"
        onClose={onClose}
        variant="danger"
        icon={
          <svg className="h-4 w-4 text-error-600 dark:text-error-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        }
      />

      <div className="p-6">
        <div className="mb-5 rounded-xl border border-error-200 bg-error-50 p-4 dark:border-error-500/30 dark:bg-error-500/10">
          <div className="flex items-start gap-3">
            <svg className="mt-0.5 h-5 w-5 shrink-0 text-error-600 dark:text-error-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-error-800 dark:text-error-300">This action is permanent and irreversible</p>
              <p className="mt-1 text-xs text-error-700 dark:text-error-400">
                Invoice <span className="font-mono font-semibold">{invoice.invoice_number}</span> will be permanently deleted from the system. All related data, including line items and billing details, will be lost. Consider voiding the invoice instead if you need to keep it for accounting records.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
            <span>Customer</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {invoice.user.first_name} {invoice.user.last_name}
            </span>
          </div>
          <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
            <span>Total Amount</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(invoice.total_amount)}
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
          Delete Invoice
        </button>
      </DialogFooter>
    </DialogShell>
  );
}

// ── Void Invoice Dialog ───────────────────────────────────────────────────────

interface VoidInvoiceDialogProps {
  invoice: AdminInvoice;
  onClose: () => void;
  onVoidSuccess: (updated: AdminInvoice) => void;
  onDeleteSuccess: () => void;
}

export function VoidInvoiceDialog({ invoice, onClose, onVoidSuccess, onDeleteSuccess }: VoidInvoiceDialogProps) {
  const [action, setAction] = useState<"void" | "delete" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleVoid = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const updated = await voidAdminInvoice(invoice.id);
      onVoidSuccess(updated);
    } catch {
      setError("Failed to void the invoice. Please try again.");
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await deleteAdminInvoice(invoice.id);
      onDeleteSuccess();
      router.push("/admin/invoices");
    } catch {
      setError("Failed to delete the invoice. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <DialogShell onClose={onClose}>
      <DialogHeader
        title="Void Invoice"
        onClose={onClose}
        icon={
          <svg className="h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        }
      />

      <div className="p-6">
        <p className="mb-5 text-sm text-gray-600 dark:text-gray-400">
          Would you like to void invoice <span className="font-mono font-semibold text-gray-900 dark:text-white">{invoice.invoice_number}</span>? Choose how you want to handle it:
        </p>

        <div className="space-y-3">
          {/* Void option */}
          <button
            onClick={() => setAction("void")}
            className={`w-full rounded-xl border p-4 text-left transition-colors ${
              action === "void"
                ? "border-brand-400 bg-brand-50 dark:border-brand-500/60 dark:bg-brand-500/10"
                : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-white/[0.02] dark:hover:border-gray-600"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${action === "void" ? "border-brand-500 bg-brand-500 dark:border-brand-400 dark:bg-brand-400" : "border-gray-300 dark:border-gray-600"}`}>
                {action === "void" && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Void the invoice</p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  Marks the invoice as void and keeps it in the system for accounting and audit purposes. Recommended for most cases.
                </p>
              </div>
            </div>
          </button>

          {/* Delete option */}
          <button
            onClick={() => setAction("delete")}
            className={`w-full rounded-xl border p-4 text-left transition-colors ${
              action === "delete"
                ? "border-error-400 bg-error-50 dark:border-error-500/60 dark:bg-error-500/10"
                : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-white/[0.02] dark:hover:border-gray-600"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${action === "delete" ? "border-error-500 bg-error-500 dark:border-error-400 dark:bg-error-400" : "border-gray-300 dark:border-gray-600"}`}>
                {action === "delete" && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </div>
              <div>
                <p className="text-sm font-medium text-error-700 dark:text-error-400">Delete the invoice</p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  Permanently removes the invoice from the system. This action cannot be undone and the record will be lost.
                </p>
              </div>
            </div>
          </button>
        </div>

        {action === "delete" && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-error-200 bg-error-50 px-3 py-2.5 dark:border-error-500/30 dark:bg-error-500/10">
            <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-error-600 dark:text-error-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p className="text-xs text-error-700 dark:text-error-400">
              Deleting is permanent. Consider voiding if you need to retain this record for accounting.
            </p>
          </div>
        )}

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
        {action === "void" && (
          <button
            onClick={handleVoid}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50 dark:bg-gray-600 dark:hover:bg-gray-500"
          >
            {submitting && (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            Void Invoice
          </button>
        )}
        {action === "delete" && (
          <button
            onClick={handleDelete}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-error-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-error-700 disabled:opacity-50 dark:bg-error-500 dark:hover:bg-error-400"
          >
            {submitting && (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            Delete Invoice
          </button>
        )}
        {!action && (
          <button
            disabled
            className="rounded-lg bg-gray-300 px-4 py-2 text-sm font-medium text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500"
          >
            Select an option
          </button>
        )}
      </DialogFooter>
    </DialogShell>
  );
}
