"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import flatpickr from "flatpickr";
import { listAdminClients } from "@/services/admin/user.service";
import { createAdminInvoice } from "@/services/admin/invoice.service";
import { useDebounce } from "@/hooks/useDebounce";
import type { AdminUser, CreateInvoicePayload } from "@/types/admin";

// ── Local line item state ─────────────────────────────────────────────────────

let item_counter = 0;
function generateItemId(): string {
  return `item_${++item_counter}_${Date.now()}`;
}

interface LocalLineItem {
  local_id: string;
  item_name: string;
  description: string;
  price: string;
  quantity: string;
  discount_type: "percent" | "fixed";
  discount_value: string;
}

function createEmptyLineItem(): LocalLineItem {
  return {
    local_id: generateItemId(),
    item_name: "",
    description: "",
    price: "",
    quantity: "1",
    discount_type: "percent",
    discount_value: "0",
  };
}

function calcItemDiscount(item: LocalLineItem): number {
  const price = parseFloat(item.price) || 0;
  const qty = Math.max(1, parseInt(item.quantity) || 1);
  const raw = price * qty;
  if (item.discount_type === "percent") {
    const disc = Math.min(100, Math.max(0, parseFloat(item.discount_value) || 0));
    return (raw * disc) / 100;
  }
  const fixed = Math.max(0, parseFloat(item.discount_value) || 0);
  return Math.min(fixed, raw);
}

function calcItemTotal(item: LocalLineItem): number {
  const price = parseFloat(item.price) || 0;
  const qty = Math.max(1, parseInt(item.quantity) || 1);
  return Math.max(0, price * qty - calcItemDiscount(item));
}

function calcSubtotal(items: LocalLineItem[]): number {
  return items.reduce((s, i) => s + calcItemTotal(i), 0);
}

function calcTotalDiscount(items: LocalLineItem[]): number {
  return items.reduce((s, item) => s + calcItemDiscount(item), 0);
}

// ── Client search dropdown ────────────────────────────────────────────────────

function ClientSearchDropdown({
  selected_client,
  on_select,
  error,
}: {
  selected_client: AdminUser | null;
  on_select: (client: AdminUser | null) => void;
  error?: string;
}) {
  const [search_input, setSearchInput] = useState("");
  const [is_open, setIsOpen] = useState(false);
  const [results, setResults] = useState<AdminUser[]>([]);
  const [is_loading, setIsLoading] = useState(false);
  const debounced_search = useDebounce(search_input, 350);
  const container_ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!debounced_search.trim()) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    listAdminClients({ search: debounced_search, page: 1 })
      .then((data) => setResults(data.data.slice(0, 8)))
      .catch(() => setResults([]))
      .finally(() => setIsLoading(false));
  }, [debounced_search]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (container_ref.current && !container_ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  if (selected_client) {
    return (
      <div
        className={`flex items-center justify-between rounded-xl border p-4 ${
          error
            ? "border-error-300 bg-error-50 dark:border-error-500/40 dark:bg-error-500/10"
            : "border-brand-200 bg-brand-50 dark:border-brand-500/30 dark:bg-brand-500/10"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 dark:bg-brand-500/20 dark:text-brand-400">
            {selected_client.first_name.charAt(0).toUpperCase()}
            {selected_client.last_name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {selected_client.first_name} {selected_client.last_name}
            </p>
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">
              {selected_client.email}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => on_select(null)}
          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          aria-label="Remove client"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div ref={container_ref} className="relative">
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="text"
          placeholder="Search clients by name or email..."
          value={search_input}
          onChange={(e) => { setSearchInput(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          className={`w-full rounded-xl border bg-white py-2.5 pl-10 pr-10 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:ring-2 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 ${
            error
              ? "border-error-400 focus:border-error-500 focus:ring-error-100 dark:border-error-500 dark:focus:ring-error-500/20"
              : "border-gray-200 focus:border-brand-400 focus:ring-brand-100 dark:border-gray-700 dark:focus:border-brand-500 dark:focus:ring-brand-500/20"
          }`}
        />
        {is_loading && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
          </div>
        )}
      </div>

      {is_open && search_input.length > 0 && (
        <div className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {results.length === 0 && !is_loading ? (
            <div className="flex items-center gap-2 px-4 py-3.5 text-sm text-gray-500 dark:text-gray-400">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              No clients found for &quot;{search_input}&quot;
            </div>
          ) : (
            <ul className="max-h-60 overflow-y-auto py-1.5">
              {results.map((client) => (
                <li key={client.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    onClick={() => { on_select(client); setIsOpen(false); setSearchInput(""); }}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                      {client.first_name.charAt(0).toUpperCase()}{client.last_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                        {client.first_name} {client.last_name}
                      </p>
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                        {client.email}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && <p className="mt-1.5 text-xs text-error-500 dark:text-error-400">{error}</p>}
    </div>
  );
}

// ── Line item row ─────────────────────────────────────────────────────────────

function LineItemRow({
  item,
  index,
  on_change,
  on_remove,
  can_remove,
  errors,
}: {
  item: LocalLineItem;
  index: number;
  on_change: (id: string, field: keyof LocalLineItem, value: string) => void;
  on_remove: (id: string) => void;
  can_remove: boolean;
  errors: Record<string, string>;
}) {
  const item_total = calcItemTotal(item);
  const has_discount = parseFloat(item.discount_value) > 0;
  const price = parseFloat(item.price) || 0;
  const qty = Math.max(1, parseInt(item.quantity) || 1);
  const raw_total = price * qty;

  return (
    <div className="group overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-sm dark:border-gray-700 dark:bg-gray-800/50">
      {/* Item header */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-gray-200 text-xs font-bold text-gray-500 dark:bg-gray-700 dark:text-gray-400">
            {index + 1}
          </div>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {item.item_name || "New item"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            {has_discount && (
              <p className="text-xs text-gray-400 line-through dark:text-gray-500">
                ${raw_total.toFixed(2)}
              </p>
            )}
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              ${item_total.toFixed(2)}
            </p>
          </div>
          {can_remove && (
            <button
              type="button"
              onClick={() => on_remove(item.local_id)}
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-error-50 hover:text-error-500 dark:hover:bg-error-500/10 dark:hover:text-error-400"
              aria-label="Remove item"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Item fields */}
      <div className="space-y-3 p-4">
        {/* Row 1: Name + metrics */}
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-12 sm:col-span-6">
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
              Item Name <span className="text-error-400">*</span>
            </label>
            <input
              type="text"
              value={item.item_name}
              onChange={(e) => on_change(item.local_id, "item_name", e.target.value)}
              placeholder="e.g. SEO Consulting Package"
              className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:ring-2 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 ${
                errors[`item_${index}_name`]
                  ? "border-error-400 focus:border-error-400 focus:ring-error-100 dark:border-error-500 dark:focus:ring-error-500/20"
                  : "border-gray-200 focus:border-brand-400 focus:ring-brand-100 dark:border-gray-600 dark:focus:border-brand-500 dark:focus:ring-brand-500/20"
              }`}
            />
            {errors[`item_${index}_name`] && (
              <p className="mt-1 text-xs text-error-500">{errors[`item_${index}_name`]}</p>
            )}
          </div>

          <div className="col-span-4 sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
              Price ($) <span className="text-error-400">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={item.price}
              onChange={(e) => on_change(item.local_id, "price", e.target.value)}
              placeholder="0.00"
              className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:ring-2 dark:bg-gray-800 dark:text-white ${
                errors[`item_${index}_price`]
                  ? "border-error-400 focus:border-error-400 focus:ring-error-100 dark:border-error-500 dark:focus:ring-error-500/20"
                  : "border-gray-200 focus:border-brand-400 focus:ring-brand-100 dark:border-gray-600 dark:focus:border-brand-500 dark:focus:ring-brand-500/20"
              }`}
            />
            {errors[`item_${index}_price`] && (
              <p className="mt-1 text-xs text-error-500">{errors[`item_${index}_price`]}</p>
            )}
          </div>

          <div className="col-span-4 sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
              Discount
            </label>
            <div className="flex overflow-hidden rounded-lg border border-gray-200 bg-white focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100 dark:border-gray-600 dark:bg-gray-800 dark:focus-within:border-brand-500 dark:focus-within:ring-brand-500/20">
              <div className="flex shrink-0 border-r border-gray-200 dark:border-gray-600">
                <button
                  type="button"
                  onClick={() => on_change(item.local_id, "discount_type", "percent")}
                  className={`px-2 py-2 text-xs font-bold transition-colors ${
                    item.discount_type === "percent"
                      ? "bg-brand-500 text-white"
                      : "text-gray-400 hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                  }`}
                  title="Percentage discount"
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() => on_change(item.local_id, "discount_type", "fixed")}
                  className={`px-2 py-2 text-xs font-bold transition-colors ${
                    item.discount_type === "fixed"
                      ? "bg-brand-500 text-white"
                      : "text-gray-400 hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                  }`}
                  title="Fixed amount discount"
                >
                  $
                </button>
              </div>
              <input
                type="number"
                min="0"
                max={item.discount_type === "percent" ? "100" : undefined}
                step={item.discount_type === "percent" ? "1" : "0.01"}
                value={item.discount_value}
                onChange={(e) => on_change(item.local_id, "discount_value", e.target.value)}
                placeholder={item.discount_type === "percent" ? "0" : "0.00"}
                className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none dark:text-white dark:placeholder-gray-500"
              />
            </div>
            {has_discount && (
              <p className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                -{item.discount_type === "percent"
                  ? `${item.discount_value}%`
                  : `$${parseFloat(item.discount_value || "0").toFixed(2)}`} off
              </p>
            )}
          </div>

          <div className="col-span-4 sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
              Quantity
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={item.quantity}
              onChange={(e) => on_change(item.local_id, "quantity", e.target.value)}
              placeholder="1"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-brand-500 dark:focus:ring-brand-500/20"
            />
          </div>
        </div>

        {/* Row 2: Description */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
            Description <span className="text-gray-400">(optional)</span>
          </label>
          <textarea
            value={item.description}
            onChange={(e) => on_change(item.local_id, "description", e.target.value)}
            placeholder="Describe this line item..."
            rows={2}
            className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/20"
          />
        </div>
      </div>
    </div>
  );
}

// ── Checkbox component ────────────────────────────────────────────────────────

function StyledCheckbox({
  checked,
  on_change,
  label,
  description,
}: {
  checked: boolean;
  on_change: (v: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={() => on_change(!checked)}
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-300 focus:ring-offset-1 ${
          checked
            ? "border-brand-500 bg-brand-500 dark:border-brand-400 dark:bg-brand-500"
            : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800"
        }`}
      >
        {checked && (
          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        )}
      </button>
      <div>
        <p className="text-sm font-medium text-gray-800 dark:text-white">{label}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      </div>
    </label>
  );
}

// ── Date picker field ─────────────────────────────────────────────────────────

function DatePickerField({
  value,
  on_change,
  error,
}: {
  value: string;
  on_change: (date: string) => void;
  error?: string;
}) {
  const input_ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!input_ref.current) return;
    const fp = flatpickr(input_ref.current, {
      mode: "single",
      dateFormat: "Y-m-d",
      defaultDate: value || undefined,
      onChange: (selected_dates) => {
        if (selected_dates[0]) {
          const d = selected_dates[0];
          const formatted = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          on_change(formatted);
        }
      },
    });

    return () => {
      if (!Array.isArray(fp)) fp.destroy();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative">
      <input
        ref={input_ref}
        readOnly
        placeholder="Select due date..."
        className={`w-full cursor-pointer rounded-xl border bg-white px-3 py-2.5 pr-10 text-sm text-gray-900 outline-none transition focus:ring-2 dark:bg-gray-800 dark:text-white ${
          error
            ? "border-error-400 focus:border-error-400 focus:ring-error-100 dark:border-error-500 dark:focus:ring-error-500/20"
            : "border-gray-200 focus:border-brand-400 focus:ring-brand-100 dark:border-gray-700 dark:focus:border-brand-500 dark:focus:ring-brand-500/20"
        }`}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CreateInvoiceContent() {
  const router = useRouter();

  const [selected_client, setSelectedClient] = useState<AdminUser | null>(null);
  const [date_due, setDateDue] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });
  const [line_items, setLineItems] = useState<LocalLineItem[]>([createEmptyLineItem()]);
  const [notes, setNotes] = useState("");
  const [send_client_notification, setSendClientNotification] = useState(true);
  const [send_admin_notification, setSendAdminNotification] = useState(false);
  const [is_submitting, setIsSubmitting] = useState(false);
  const [submit_error, setSubmitError] = useState<string | null>(null);
  const [validation_errors, setValidationErrors] = useState<Record<string, string>>({});

  const subtotal = calcSubtotal(line_items);
  const total_discount = calcTotalDiscount(line_items);

  function addLineItem() {
    setLineItems((prev) => [...prev, createEmptyLineItem()]);
  }

  function removeLineItem(local_id: string) {
    setLineItems((prev) => prev.filter((i) => i.local_id !== local_id));
  }

  function updateLineItem(local_id: string, field: keyof LocalLineItem, value: string) {
    setLineItems((prev) =>
      prev.map((i) => (i.local_id === local_id ? { ...i, [field]: value } as LocalLineItem : i))
    );
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {};
    if (!selected_client) errors.client = "Please select a client to invoice";
    if (!date_due) errors.date_due = "A due date is required";

    line_items.forEach((item, idx) => {
      if (!item.item_name.trim()) errors[`item_${idx}_name`] = "Item name is required";
      const p = parseFloat(item.price);
      if (isNaN(p) || p < 0) errors[`item_${idx}_price`] = "Enter a valid price (≥ 0)";
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload: CreateInvoicePayload = {
        user_id: selected_client!.id,
        date_due,
        line_items: line_items.map((item) => {
          const price = parseFloat(item.price) || 0;
          const qty = Math.max(1, parseInt(item.quantity) || 1);
          const raw = price * qty;
          let discount_percent: number | undefined;
          if (item.discount_type === "percent") {
            const p = parseFloat(item.discount_value) || 0;
            if (p > 0) discount_percent = p;
          } else {
            const fixed = parseFloat(item.discount_value) || 0;
            if (fixed > 0 && raw > 0) discount_percent = (fixed / raw) * 100;
          }
          return {
            item_name: item.item_name.trim(),
            description: item.description.trim() || undefined,
            price,
            quantity: qty,
            discount_percent,
          };
        }),
        notes: notes.trim() || undefined,
        send_client_notification,
        send_admin_notification,
      };

      const invoice = await createAdminInvoice(payload);
      router.push(`/admin/invoices/${invoice.id}`);
    } catch (err: unknown) {
      const api_error = err as { message?: string };
      setSubmitError(api_error?.message || "Failed to create invoice. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {/* Page header */}
      <div>
        <Link
          href="/admin/invoices"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to Invoices
        </Link>
        <div className="mt-4">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Create Invoice</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Generate a new invoice for a client with custom line items
          </p>
        </div>
      </div>

      {submit_error && (
        <div className="flex items-start gap-3 rounded-xl border border-error-200 bg-error-50 p-4 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
          <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          {submit_error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* ── Left column ──────────────────────────────────── */}
        <div className="space-y-6 lg:col-span-8">

          {/* Client section */}
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex items-center gap-2.5 border-b border-gray-100 px-6 py-4 dark:border-gray-800">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-500/10">
                <svg className="h-4 w-4 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-gray-800 dark:text-white/90">Client</span>
              <span className="ml-auto rounded-full bg-error-50 px-2 py-0.5 text-xs font-medium text-error-600 dark:bg-error-500/10 dark:text-error-400">
                Required
              </span>
            </div>
            <div className="p-6">
              <ClientSearchDropdown
                selected_client={selected_client}
                on_select={setSelectedClient}
                error={validation_errors.client}
              />
            </div>
          </div>

          {/* Line items section */}
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex items-center gap-2.5 border-b border-gray-100 px-6 py-4 dark:border-gray-800">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-500/10">
                <svg className="h-4 w-4 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-gray-800 dark:text-white/90">Line Items</span>
              <span className="ml-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                {line_items.length}
              </span>
            </div>
            <div className="space-y-3 p-6">
              {/* Column headers (hidden on mobile) */}
              <div className="hidden grid-cols-12 gap-3 px-4 sm:grid">
                <div className="col-span-6 text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">Item</div>
                <div className="col-span-2 text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">Price</div>
                <div className="col-span-2 text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">Discount</div>
                <div className="col-span-2 text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">Qty</div>
              </div>

              {line_items.map((item, index) => (
                <LineItemRow
                  key={item.local_id}
                  item={item}
                  index={index}
                  on_change={updateLineItem}
                  on_remove={removeLineItem}
                  can_remove={line_items.length > 1}
                  errors={validation_errors}
                />
              ))}

              {/* Add item button */}
              <button
                type="button"
                onClick={addLineItem}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 py-3 text-sm font-medium text-gray-500 transition-colors hover:border-brand-400 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-brand-500 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add line item
              </button>

              {/* Subtotal strip */}
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-5 py-4 dark:border-gray-700 dark:bg-gray-800/60">
                <div className="ml-auto max-w-xs space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">
                      Subtotal ({line_items.length} {line_items.length === 1 ? "item" : "items"})
                    </span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      ${(subtotal + total_discount).toFixed(2)}
                    </span>
                  </div>
                  {total_discount > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                        </svg>
                        Discounts applied
                      </span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">
                        -${total_discount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-gray-200 pt-2 dark:border-gray-700">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">Total</span>
                    <span className="text-base font-bold text-gray-900 dark:text-white">
                      USD ${subtotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes section */}
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex items-center gap-2.5 border-b border-gray-100 px-6 py-4 dark:border-gray-800">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-500/10">
                <svg className="h-4 w-4 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-gray-800 dark:text-white/90">Note to Client</span>
              <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">Optional</span>
            </div>
            <div className="p-6">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Add any notes or special instructions visible to the client on this invoice..."
                className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/20"
              />
            </div>
          </div>
        </div>

        {/* ── Right column ──────────────────────────────────── */}
        <div className="space-y-4 lg:col-span-4">

          {/* Invoice summary card */}
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Invoice Summary</h3>
            </div>
            <div className="space-y-4 p-5">
              {/* Date due */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Date Due <span className="text-error-400">*</span>
                </label>
                <DatePickerField
                  value={date_due}
                  on_change={setDateDue}
                  error={validation_errors.date_due}
                />
                {validation_errors.date_due && (
                  <p className="mt-1 text-xs text-error-500">{validation_errors.date_due}</p>
                )}
              </div>

              {/* Stats */}
              <div className="space-y-2.5 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700/50 dark:bg-gray-800/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Items</span>
                  <span className="text-xs font-semibold tabular-nums text-gray-700 dark:text-gray-300">
                    {line_items.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Subtotal</span>
                  <span className="text-xs font-medium tabular-nums text-gray-700 dark:text-gray-300">
                    ${(subtotal + total_discount).toFixed(2)}
                  </span>
                </div>
                {total_discount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-emerald-600 dark:text-emerald-400">Discounts</span>
                    <span className="text-xs font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                      -${total_discount.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-gray-200 pt-2 dark:border-gray-700">
                  <span className="text-sm font-bold text-gray-900 dark:text-white">Total</span>
                  <span className="text-base font-bold text-brand-600 dark:text-brand-400 tabular-nums">
                    ${subtotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notifications card */}
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex items-center gap-2.5 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 dark:bg-sky-500/10">
                <svg className="h-4 w-4 text-sky-600 dark:text-sky-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-gray-800 dark:text-white/90">Notifications</span>
            </div>
            <div className="space-y-4 p-5">
              <StyledCheckbox
                checked={send_client_notification}
                on_change={setSendClientNotification}
                label="Notify client"
                description="Send an email to the client with the invoice details and payment link"
              />
              <StyledCheckbox
                checked={send_admin_notification}
                on_change={setSendAdminNotification}
                label="Notify admin team"
                description="Send an internal notification to the admin team about this invoice"
              />
            </div>
          </div>

          {/* Generate button */}
          <button
            type="submit"
            disabled={is_submitting}
            className="group relative w-full overflow-hidden rounded-xl bg-brand-600 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-brand-500 dark:hover:bg-brand-600"
          >
            {is_submitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating Invoice...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                Generate Invoice
              </span>
            )}
          </button>

          <p className="text-center text-xs text-gray-400 dark:text-gray-500">
            The invoice will be visible in the client&apos;s portal immediately
          </p>
        </div>
      </div>
    </form>
  );
}
