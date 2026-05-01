"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { adminSeoSubscriptionService } from "@/services/admin/seo-packages-subscription.service";
import type {
  AdminUserSearchResult,
  ActivateSeoSubscriptionPayload,
} from "@/services/admin/seo-packages-subscription.service";
import { listAdminSeoPackages } from "@/services/admin/seo-packages.service";
import type { AdminSeoPackage } from "@/types/admin/seo-packages";

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ActivateSubscriptionModal({ onSuccess, onCancel }: Props) {
  const [packages, setPackages] = useState<AdminSeoPackage[]>([]);
  const [packages_loading, setPackagesLoading] = useState(true);

  const [all_clients, setAllClients] = useState<AdminUserSearchResult[]>([]);
  const [clients_loading, setClientsLoading] = useState(true);
  const [client_filter, setClientFilter] = useState("");
  const [selected_user, setSelectedUser] = useState<AdminUserSearchResult | null>(null);
  const [show_client_dropdown, setShowClientDropdown] = useState(false);
  const client_select_ref = useRef<HTMLDivElement>(null);

  const [selected_package_id, setSelectedPackageId] = useState("");
  const [starts_at, setStartsAt] = useState(() => new Date().toISOString().split("T")[0]);
  const [ends_at, setEndsAt] = useState("");
  const [notes, setNotes] = useState("");
  const [is_submitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPackagesLoading(true);
    listAdminSeoPackages()
      .then((data) => setPackages(data.filter((p) => p.is_active)))
      .catch(() => setPackages([]))
      .finally(() => setPackagesLoading(false));
  }, []);

  useEffect(() => {
    setClientsLoading(true);
    adminSeoSubscriptionService
      .listAllClients()
      .then((data) => setAllClients(data))
      .catch(() => setAllClients([]))
      .finally(() => setClientsLoading(false));
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (client_select_ref.current && !client_select_ref.current.contains(e.target as Node)) {
        setShowClientDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered_clients = useMemo(() => {
    const query = client_filter.trim().toLowerCase();
    if (!query) return all_clients;
    return all_clients.filter(
      (c) =>
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(query) ||
        c.email.toLowerCase().includes(query) ||
        (c.organization ?? "").toLowerCase().includes(query)
    );
  }, [all_clients, client_filter]);

  const handleSelectUser = useCallback((user: AdminUserSearchResult) => {
    setSelectedUser(user);
    setShowClientDropdown(false);
    setClientFilter("");
  }, []);

  const handleClearUser = useCallback(() => {
    setSelectedUser(null);
    setClientFilter("");
  }, []);

  const toggleClientDropdown = useCallback(() => {
    setShowClientDropdown((prev) => !prev);
    setClientFilter("");
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selected_user || !selected_package_id || !starts_at) return;
      setError(null);
      setIsSubmitting(true);
      const payload: ActivateSeoSubscriptionPayload = {
        user_id: selected_user.id,
        package_id: selected_package_id,
        starts_at,
        ends_at: ends_at || null,
        notes: notes.trim() || undefined,
      };
      try {
        await adminSeoSubscriptionService.activateSubscription(payload);
        onSuccess();
      } catch {
        setError("Failed to activate subscription. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [selected_user, selected_package_id, starts_at, ends_at, notes, onSuccess]
  );

  const is_form_valid = !!selected_user && !!selected_package_id && !!starts_at;

  return (
    <div className="fixed inset-0 z-99999 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/10">
              <svg className="h-4.5 w-4.5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Activate SEO Subscription
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Manually activate a package for a client
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {/* Client searchable select */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Client <span className="text-error-500">*</span>
            </label>
            <div className="relative" ref={client_select_ref}>
              {/* Trigger */}
              <button
                type="button"
                onClick={toggleClientDropdown}
                disabled={clients_loading}
                className="flex h-10 w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-3 text-sm transition-colors focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800"
              >
                {clients_loading ? (
                  <span className="text-gray-400 dark:text-gray-500">Loading clients…</span>
                ) : selected_user ? (
                  <span className="truncate text-gray-900 dark:text-white">
                    {selected_user.first_name} {selected_user.last_name}
                    <span className="ml-1.5 text-gray-400 dark:text-gray-500">— {selected_user.email}</span>
                  </span>
                ) : (
                  <span className="text-gray-400 dark:text-gray-500">Select a client…</span>
                )}
                <div className="ml-2 flex shrink-0 items-center gap-1">
                  {selected_user && !clients_loading && (
                    <span
                      role="button"
                      aria-label="Clear selection"
                      onClick={(e) => { e.stopPropagation(); handleClearUser(); }}
                      className="rounded p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </span>
                  )}
                  <svg
                    className={`h-4 w-4 text-gray-400 transition-transform ${show_client_dropdown ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Dropdown */}
              {show_client_dropdown && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                  {/* Search input */}
                  <div className="border-b border-gray-100 p-2 dark:border-gray-700">
                    <div className="relative">
                      <svg className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        type="text"
                        value={client_filter}
                        onChange={(e) => setClientFilter(e.target.value)}
                        placeholder="Search by name, email or organization…"
                        autoFocus
                        autoComplete="off"
                        className="h-8 w-full rounded-lg border border-gray-200 bg-gray-50 pl-8 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
                      />
                    </div>
                  </div>

                  {/* Client list */}
                  <div className="max-h-52 overflow-y-auto">
                    {filtered_clients.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        No clients found.
                      </p>
                    ) : (
                      filtered_clients.map((client) => (
                        <button
                          key={client.id}
                          type="button"
                          onClick={() => handleSelectUser(client)}
                          className="flex w-full flex-col px-4 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {client.first_name} {client.last_name}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {client.email}
                            {client.organization ? ` · ${client.organization}` : ""}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {selected_user && (
              <p className="mt-1.5 text-xs text-success-600 dark:text-success-400">
                Client selected: {selected_user.first_name} {selected_user.last_name}
              </p>
            )}
          </div>

          {/* Package select */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              SEO Package <span className="text-error-500">*</span>
            </label>
            {packages_loading ? (
              <div className="h-10 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
            ) : (
              <select
                value={selected_package_id}
                onChange={(e) => setSelectedPackageId(e.target.value)}
                required
                className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="">Select a package…</option>
                {packages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.name} — ${pkg.price_per_month}/mo
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Start Date <span className="text-error-500">*</span>
              </label>
              <input
                type="date"
                value={starts_at}
                onChange={(e) => setStartsAt(e.target.value)}
                required
                className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                End Date
                <span className="ml-1 text-xs font-normal text-gray-400">(optional)</span>
              </label>
              <input
                type="date"
                value={ends_at}
                min={starts_at}
                onChange={(e) => setEndsAt(e.target.value)}
                className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              <p className="mt-1 text-xs text-gray-400">Leave blank for no expiration</p>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Internal Notes
              <span className="ml-1 text-xs font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="e.g. Activated after 30-min strategy call on Apr 29…"
              className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onCancel}
              disabled={is_submitting}
              className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!is_form_valid || is_submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {is_submitting ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Activating…
                </>
              ) : (
                "Activate Subscription"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
