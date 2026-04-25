"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { OrderItem, OrderPlacementDetail } from "@/types/admin";

interface ImportOrderItemsModalProps {
  is_open: boolean;
  is_importing: boolean;
  items: OrderItem[];
  existing_row_count: number;
  onConfirm: (placement_ids: string[]) => Promise<void>;
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

const KeywordIcon = () => (
  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
  </svg>
);

const LinkIcon = () => (
  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
  </svg>
);

const TargetIcon = () => (
  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a7.464 7.464 0 01-1.15 3.993m1.989 3.559A11.209 11.209 0 008.25 10.5a3.75 3.75 0 117.5 0c0 .527-.021 1.049-.064 1.565M12 10.5a14.94 14.94 0 01-3.6 9.75m6.633-4.596a18.666 18.666 0 01-2.485 5.33" />
  </svg>
);

const TierIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 2.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
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

function truncateLandingPage(url: string | null, max = 42): string {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    const full = parsed.hostname + parsed.pathname;
    return full.length > max ? full.slice(0, max) + "…" : full;
  } catch {
    return url.length > max ? url.slice(0, max) + "…" : url;
  }
}

// ── Indeterminate checkbox ────────────────────────────────────────────────────

interface IndeterminateCheckboxProps {
  checked: boolean;
  indeterminate: boolean;
  disabled?: boolean;
  onChange: () => void;
}

function IndeterminateCheckbox({ checked, indeterminate, disabled, onChange }: IndeterminateCheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 disabled:opacity-60 dark:border-gray-600"
    />
  );
}

// ── Placement row ─────────────────────────────────────────────────────────────

interface PlacementRowProps {
  placement: OrderPlacementDetail;
  index: number;
  is_selected: boolean;
  is_disabled: boolean;
  onToggle: (id: string) => void;
}

function PlacementRow({ placement, index, is_selected, is_disabled, onToggle }: PlacementRowProps) {
  const has_keyword = Boolean(placement.keyword?.trim());
  const has_landing = Boolean(placement.landing_page?.trim());

  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-all ${
        is_selected
          ? "border-brand-200 bg-brand-50/50 dark:border-brand-500/30 dark:bg-brand-500/5"
          : "border-gray-100 bg-gray-50/50 hover:border-gray-200 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-800/20 dark:hover:border-gray-700"
      } ${is_disabled ? "pointer-events-none opacity-60" : ""}`}
    >
      {/* Checkbox */}
      <div className="flex h-5 items-center pt-0.5">
        <input
          type="checkbox"
          checked={is_selected}
          onChange={() => onToggle(placement.id)}
          disabled={is_disabled}
          className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 disabled:opacity-60 dark:border-gray-600"
        />
      </div>

      {/* Index bubble */}
      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
        is_selected
          ? "bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300"
          : "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
      }`}>
        {index + 1}
      </div>

      {/* Fields */}
      <div className="min-w-0 flex-1 space-y-1.5">
        {/* Keyword */}
        <div className="flex items-start gap-2">
          <span className="mt-0.5 shrink-0 text-gray-400 dark:text-gray-500">
            <KeywordIcon />
          </span>
          {has_keyword ? (
            <span className="text-xs font-medium text-gray-800 dark:text-white/90">
              {placement.keyword}
            </span>
          ) : (
            <span className="text-xs italic text-gray-400 dark:text-gray-500">
              No keyword provided
            </span>
          )}
        </div>

        {/* Landing page */}
        <div className="flex items-start gap-2">
          <span className="mt-0.5 shrink-0 text-gray-400 dark:text-gray-500">
            <LinkIcon />
          </span>
          {has_landing ? (
            <span
              className="text-xs text-brand-600 dark:text-brand-400 truncate"
              title={placement.landing_page ?? ""}
            >
              {truncateLandingPage(placement.landing_page)}
            </span>
          ) : (
            <span className="text-xs italic text-gray-400 dark:text-gray-500">
              No landing page provided
            </span>
          )}
        </div>

        {/* Exact match */}
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-gray-400 dark:text-gray-500">
            <TargetIcon />
          </span>
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            placement.exact_match
              ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400"
              : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
          }`}>
            {placement.exact_match ? "Exact match" : "Partial match"}
          </span>
        </div>
      </div>
    </label>
  );
}

// ── Item group header ─────────────────────────────────────────────────────────

interface ItemGroupHeaderProps {
  item: OrderItem;
  selected_count: number;
  total_count: number;
  is_disabled: boolean;
  onToggleAll: () => void;
}

function ItemGroupHeader({ item, selected_count, total_count, is_disabled, onToggleAll }: ItemGroupHeaderProps) {
  const is_all = selected_count === total_count;
  const is_partial = selected_count > 0 && !is_all;
  const tier_label = item.dr_tier?.label ?? `Tier ${item.dr_tier_id}`;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800/60">
      <IndeterminateCheckbox
        checked={is_all}
        indeterminate={is_partial}
        disabled={is_disabled}
        onChange={onToggleAll}
      />
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
        <TierIcon />
      </div>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-sm font-semibold text-gray-800 dark:text-white">
          {tier_label}
        </span>
        {item.dr_tier?.traffic_range && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {item.dr_tier.traffic_range} traffic
          </span>
        )}
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
          {total_count} placement{total_count !== 1 ? "s" : ""}
        </span>
        {selected_count > 0 && selected_count < total_count && (
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
            {selected_count} selected
          </span>
        )}
      </div>
      <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-500 dark:text-gray-400">
        {formatCurrency(item.unit_price)}<span className="text-xs font-normal">/link</span>
      </span>
    </div>
  );
}

// ── Empty placements notice ───────────────────────────────────────────────────

function NoPlacements() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <svg className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
      </svg>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
        No placement data available
      </p>
      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
        The order items do not contain placement details. Contact support.
      </p>
    </div>
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
  const [selected_ids, setSelectedIds] = useState<Set<string>>(new Set());

  // Flatten all placements for convenience
  const all_placements: Array<{ placement: OrderPlacementDetail; item: OrderItem }> = items.flatMap(
    (item) => (item.placements ?? []).map((p) => ({ placement: p, item }))
  );
  const total_placements = all_placements.length;

  // Initialize with all selected whenever modal opens
  useEffect(() => {
    if (is_open) {
      setSelectedIds(new Set(all_placements.map((p) => p.placement.id)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [is_open]);

  // Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && is_open && !is_importing) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [is_open, is_importing, onClose]);

  const togglePlacement = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleItemGroup = useCallback(
    (item: OrderItem) => {
      const ids = (item.placements ?? []).map((p) => p.id);
      const all_selected = ids.every((id) => selected_ids.has(id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (all_selected) ids.forEach((id) => next.delete(id));
        else ids.forEach((id) => next.add(id));
        return next;
      });
    },
    [selected_ids]
  );

  const selectAll = useCallback(
    () => setSelectedIds(new Set(all_placements.map((p) => p.placement.id))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [is_open]
  );
  const deselectAll = useCallback(() => setSelectedIds(new Set()), []);

  const selected_count = selected_ids.size;
  const all_selected = selected_count === total_placements && total_placements > 0;
  const none_selected = selected_count === 0;

  async function handleConfirm() {
    if (none_selected) return;
    await onConfirm(Array.from(selected_ids));
  }

  if (!is_open) return null;

  const is_first_import = existing_row_count === 0;
  const has_placements = total_placements > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => !is_importing && onClose()}
      />

      {/* Panel */}
      <div
        className="relative flex w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900"
        style={{ maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
              <ImportIcon />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Import Order Items
              </h2>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Sync report rows from the original purchase data
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
        <div className={`mx-6 mt-5 shrink-0 flex items-start gap-3 rounded-xl px-4 py-3 ${
          is_first_import
            ? "border border-warning-200 bg-warning-50 dark:border-warning-500/20 dark:bg-warning-500/10"
            : "border border-blue-200 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10"
        }`}>
          <svg
            className={`mt-0.5 h-4 w-4 shrink-0 ${is_first_import ? "text-warning-500" : "text-blue-500"}`}
            fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
          <p className={`text-xs leading-relaxed ${
            is_first_import
              ? "text-warning-700 dark:text-warning-400"
              : "text-blue-700 dark:text-blue-400"
          }`}>
            {is_first_import
              ? "No rows have been imported yet. Select the placements below — each one will generate a report row pre-filled with the client's keyword and landing page."
              : "Each selected placement will create or update its corresponding report row. Fields already marked as Live will not be overwritten."}
          </p>
        </div>

        {/* Select all / controls */}
        {has_placements && (
          <div className="flex shrink-0 items-center justify-between px-6 pt-4 pb-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Placements{" "}
              <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                {selected_count} of {total_placements} selected
              </span>
            </p>
            <button
              type="button"
              onClick={all_selected ? deselectAll : selectAll}
              disabled={is_importing}
              className="text-xs font-medium text-brand-600 transition-colors hover:text-brand-700 disabled:opacity-50 dark:text-brand-400 dark:hover:text-brand-300"
            >
              {all_selected ? "Deselect all" : "Select all"}
            </button>
          </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 pb-3">
          {!has_placements ? (
            <NoPlacements />
          ) : (
            <div className="space-y-4 py-1">
              {items.map((item) => {
                const placements = item.placements ?? [];
                if (placements.length === 0) return null;

                const group_selected = placements.filter((p) => selected_ids.has(p.id)).length;

                return (
                  <div key={item.id} className="space-y-1.5">
                    {/* Group header */}
                    <ItemGroupHeader
                      item={item}
                      selected_count={group_selected}
                      total_count={placements.length}
                      is_disabled={is_importing}
                      onToggleAll={() => toggleItemGroup(item)}
                    />

                    {/* Placement rows — indented */}
                    <div className="ml-4 space-y-1.5 border-l-2 border-gray-100 pl-4 dark:border-gray-800">
                      {placements.map((placement, idx) => (
                        <PlacementRow
                          key={placement.id}
                          placement={placement}
                          index={idx}
                          is_selected={selected_ids.has(placement.id)}
                          is_disabled={is_importing}
                          onToggle={togglePlacement}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Summary strip */}
        {selected_count > 0 && (
          <div className="mx-6 mb-4 shrink-0 flex items-center justify-between rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-2.5 dark:border-brand-500/20 dark:bg-brand-500/5">
            <div className="flex items-center gap-2 text-xs text-brand-700 dark:text-brand-400">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                <strong>{selected_count}</strong> placement{selected_count !== 1 ? "s" : ""} will be imported as report rows
              </span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex shrink-0 gap-3 border-t border-gray-100 px-6 py-4 dark:border-gray-800">
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
            disabled={is_importing || none_selected || !has_placements}
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
                  ? "Select placements"
                  : `Import ${selected_count} Placement${selected_count !== 1 ? "s" : ""}`}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
