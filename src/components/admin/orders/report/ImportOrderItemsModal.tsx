"use client";

import { useState, useEffect, useCallback } from "react";
import type { OrderItem } from "@/types/admin";

interface ImportOrderItemsModalProps {
  is_open: boolean;
  is_importing: boolean;
  items: OrderItem[];
  existing_row_count: number;
  onConfirm: (item_ids: number[]) => Promise<void>;
  onClose: () => void;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const ImportIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

const XIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const SpinnerIcon = () => (
  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

const TierIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 2.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

// ── Item row ─────────────────────────────────────────────────────────────────

interface ItemRowProps {
  item: OrderItem;
  index: number;
  is_selected: boolean;
  is_disabled: boolean;
  onToggle: (id: number) => void;
}

function ItemRow({ item, index, is_selected, is_disabled, onToggle }: ItemRowProps) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-4 rounded-xl border px-4 py-3.5 transition-all ${
        is_selected
          ? "border-brand-300 bg-brand-50/60 dark:border-brand-500/40 dark:bg-brand-500/5"
          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/60 dark:border-gray-700 dark:bg-gray-800/40 dark:hover:border-gray-600"
      } ${is_disabled ? "pointer-events-none opacity-60" : ""}`}
    >
      {/* Custom checkbox */}
      <div
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all ${
          is_selected
            ? "border-brand-500 bg-brand-500"
            : "border-gray-300 dark:border-gray-600"
        }`}
      >
        {is_selected && (
          <span className="text-white">
            <CheckIcon />
          </span>
        )}
        <input
          type="checkbox"
          className="sr-only"
          checked={is_selected}
          onChange={() => onToggle(item.id)}
          disabled={is_disabled}
        />
      </div>

      {/* Tier icon */}
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
        is_selected
          ? "bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400"
          : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
      }`}>
        <TierIcon />
      </div>

      {/* Labels */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-sm font-semibold ${is_selected ? "text-brand-700 dark:text-brand-300" : "text-gray-800 dark:text-white"}`}>
            DR Tier {item.dr_tier_id}
          </span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
            Item #{index + 1}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          {item.quantity} placement{item.quantity !== 1 ? "s" : ""} &nbsp;·&nbsp;
          {formatCurrency(item.unit_price)} per link
        </p>
      </div>

      {/* Subtotal */}
      <div className="shrink-0 text-right">
        <p className={`text-sm font-semibold tabular-nums ${is_selected ? "text-brand-700 dark:text-brand-300" : "text-gray-700 dark:text-gray-300"}`}>
          {formatCurrency(item.subtotal)}
        </p>
        <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">subtotal</p>
      </div>
    </label>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ImportOrderItemsModal({
  is_open,
  is_importing,
  items,
  existing_row_count,
  onConfirm,
  onClose,
}: ImportOrderItemsModalProps) {
  const [selected_ids, setSelectedIds] = useState<Set<number>>(new Set());

  // Initialize with all items selected whenever modal opens
  useEffect(() => {
    if (is_open) {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  }, [is_open, items]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && is_open && !is_importing) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [is_open, is_importing, onClose]);

  const toggleItem = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => setSelectedIds(new Set(items.map((i) => i.id))), [items]);
  const deselectAll = useCallback(() => setSelectedIds(new Set()), []);

  const all_selected = selected_ids.size === items.length;
  const none_selected = selected_ids.size === 0;
  const selected_count = selected_ids.size;

  const total_placements = items
    .filter((i) => selected_ids.has(i.id))
    .reduce((acc, i) => acc + i.quantity, 0);

  async function handleConfirm() {
    if (none_selected) return;
    await onConfirm(Array.from(selected_ids));
  }

  if (!is_open) return null;

  const is_incomplete = existing_row_count === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => !is_importing && onClose()}
      />

      {/* Panel */}
      <div className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900"
        style={{ maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
              <ImportIcon />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Import Order Items
              </h2>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Sync report rows from the original purchase
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={is_importing}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <XIcon />
          </button>
        </div>

        {/* Info banner */}
        <div className={`mx-6 mt-5 flex items-start gap-3 rounded-xl px-4 py-3 ${
          is_incomplete
            ? "border border-warning-200 bg-warning-50 dark:border-warning-500/20 dark:bg-warning-500/10"
            : "border border-blue-200 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10"
        }`}>
          <svg
            className={`mt-0.5 h-4 w-4 shrink-0 ${is_incomplete ? "text-warning-500" : "text-blue-500"}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
          <p className={`text-xs leading-relaxed ${
            is_incomplete
              ? "text-warning-700 dark:text-warning-400"
              : "text-blue-700 dark:text-blue-400"
          }`}>
            {is_incomplete
              ? "No rows have been imported yet for this order. Select the items below to generate report rows automatically."
              : "This operation will create or update report rows based on the selected order items. Existing delivery data will not be overwritten."}
          </p>
        </div>

        {/* Select all / deselect controls */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Order items{" "}
            <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              {selected_count} of {items.length} selected
            </span>
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={all_selected ? deselectAll : selectAll}
              disabled={is_importing}
              className="text-xs font-medium text-brand-600 transition-colors hover:text-brand-700 disabled:opacity-50 dark:text-brand-400 dark:hover:text-brand-300"
            >
              {all_selected ? "Deselect all" : "Select all"}
            </button>
          </div>
        </div>

        {/* Item list — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 pb-2">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <svg className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                No order items found
              </p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                This order has no purchasable items to import.
              </p>
            </div>
          ) : (
            <div className="space-y-2 py-1">
              {items.map((item, idx) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  index={idx}
                  is_selected={selected_ids.has(item.id)}
                  is_disabled={is_importing}
                  onToggle={toggleItem}
                />
              ))}
            </div>
          )}
        </div>

        {/* Summary strip */}
        {selected_count > 0 && (
          <div className="mx-6 mb-4 mt-3 flex items-center justify-between rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-2.5 dark:border-brand-500/20 dark:bg-brand-500/5">
            <div className="flex items-center gap-2 text-xs text-brand-700 dark:text-brand-400">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                <strong>{selected_count}</strong> item{selected_count !== 1 ? "s" : ""} ·{" "}
                <strong>{total_placements}</strong> placement{total_placements !== 1 ? "s" : ""} will be imported
              </span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-3 border-t border-gray-100 px-6 py-4 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            disabled={is_importing}
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-transparent dark:text-gray-400 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={is_importing || none_selected}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-500/20 transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {is_importing ? (
              <>
                <SpinnerIcon />
                Importing...
              </>
            ) : (
              <>
                <ImportIcon />
                {none_selected
                  ? "Select items to import"
                  : `Import ${selected_count} Item${selected_count !== 1 ? "s" : ""}`}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
