"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { listAdminClients } from "@/services/admin/user.service";
import { useDebounce } from "@/hooks/useDebounce";
import type { AdminUser } from "@/types/admin";

const INITIAL_PER_PAGE = 100;
const SEARCH_PER_PAGE = 50;

// ── Avatar color helper ───────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400",
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400",
  "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",
];

function getAvatarColor(user_id: number): string {
  return AVATAR_COLORS[user_id % AVATAR_COLORS.length];
}

// ── Component ─────────────────────────────────────────────────────────────────

export interface ClientSelectDropdownProps {
  selected_client: AdminUser | null;
  on_select: (client: AdminUser | null) => void;
  error?: string;
}

export default function ClientSelectDropdown({
  selected_client,
  on_select,
  error,
}: ClientSelectDropdownProps) {
  const [clients, setClients] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [search_input, setSearchInput] = useState("");
  const [is_open, setIsOpen] = useState(false);
  const [is_loading, setIsLoading] = useState(false);
  const [fetch_error, setFetchError] = useState<string | null>(null);

  const container_ref = useRef<HTMLDivElement>(null);
  const search_input_ref = useRef<HTMLInputElement>(null);

  const debounced_search = useDebounce(search_input, 450);

  const fetchClients = useCallback(async (search: string) => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const data = await listAdminClients({
        page: 1,
        per_page: search.trim() ? SEARCH_PER_PAGE : INITIAL_PER_PAGE,
        search: search.trim() || undefined,
        sort_field: "first_name",
        sort_direction: "asc",
      });
      setClients(data.data ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setFetchError("Failed to load clients.");
      setClients([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (is_open) {
      fetchClients(debounced_search);
    }
  }, [is_open, debounced_search, fetchClients]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (container_ref.current && !container_ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  useEffect(() => {
    if (is_open && search_input_ref.current) {
      search_input_ref.current.focus();
    }
  }, [is_open]);

  function handleOpen() {
    setIsOpen(true);
  }

  function handleClose() {
    setIsOpen(false);
    setSearchInput("");
  }

  function handleSelect(client: AdminUser) {
    on_select(client);
    handleClose();
  }

  // ── Selected state ─────────────────────────────────────────────────────────

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
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${getAvatarColor(selected_client.id)}`}
          >
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
            {selected_client.company && (
              <p className="truncate text-xs text-gray-400 dark:text-gray-500">
                {selected_client.company}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => on_select(null)}
          className="ml-3 shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          aria-label="Change client"
          title="Change client"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  }

  // ── Trigger button / search input ──────────────────────────────────────────

  return (
    <div ref={container_ref} className="relative">
      {/* Trigger / search */}
      <div className="relative">
        {!is_open ? (
          <>
            <svg
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            <button
              type="button"
              onClick={handleOpen}
              className={`w-full rounded-xl border bg-white py-2.5 pl-10 pr-10 text-left text-sm outline-none transition focus:ring-2 dark:bg-gray-800 cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 ${
                error
                  ? "border-error-400 focus:border-error-500 focus:ring-error-100 dark:border-error-500 dark:focus:ring-error-500/20 text-gray-400"
                  : "border-gray-200 focus:border-brand-400 focus:ring-brand-100 dark:border-gray-700 dark:focus:border-brand-500 dark:focus:ring-brand-500/20 text-gray-400"
              }`}
            >
              Select a client...
            </button>
            <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2">
              <svg
                className="h-4 w-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </div>
          </>
        ) : (
          <>
            <svg
              className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              ref={search_input_ref}
              type="text"
              placeholder="Search by name, email or company..."
              value={search_input}
              onChange={(e) => setSearchInput(e.target.value)}
              className={`w-full rounded-xl border bg-white py-2.5 pl-10 pr-10 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:ring-2 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 ${
                error
                  ? "border-error-400 focus:border-error-500 focus:ring-error-100 dark:border-error-500 dark:focus:ring-error-500/20"
                  : "border-brand-400 focus:border-brand-500 focus:ring-brand-100 dark:border-brand-500 dark:focus:ring-brand-500/20"
              }`}
            />
            <button
              type="button"
              onClick={handleClose}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Close dropdown"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Dropdown list */}
      {is_open && (
        <div className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {/* Result count bar */}
          {!is_loading && !fetch_error && total > 0 && (
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2 dark:border-gray-700">
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {search_input.trim()
                  ? `${clients.length} result${clients.length !== 1 ? "s" : ""} for "${search_input.trim()}"`
                  : total > clients.length
                  ? `Showing ${clients.length} of ${total} clients — type to search`
                  : `${total} client${total !== 1 ? "s" : ""}`}
              </span>
              {is_loading && (
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
              )}
            </div>
          )}

          {/* Loading skeleton */}
          {is_loading ? (
            <ul className="max-h-80 overflow-y-auto py-1.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <li key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-gray-100 dark:bg-gray-700" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-32 animate-pulse rounded bg-gray-100 dark:bg-gray-700" />
                    <div className="h-2.5 w-44 animate-pulse rounded bg-gray-100 dark:bg-gray-700" />
                  </div>
                </li>
              ))}
            </ul>
          ) : fetch_error ? (
            <div className="flex items-center gap-2 px-4 py-4 text-sm text-error-500 dark:text-error-400">
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              {fetch_error}
            </div>
          ) : clients.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">No clients found</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {search_input.trim()
                  ? "Try adjusting your search term."
                  : "No client accounts are registered yet."}
              </p>
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1.5">
              {clients.map((client) => (
                <li key={client.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    onClick={() => handleSelect(client)}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${getAvatarColor(client.id)}`}
                    >
                      {client.first_name.charAt(0).toUpperCase()}
                      {client.last_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                        {client.first_name} {client.last_name}
                      </p>
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                        {client.email}
                        {client.company ? ` · ${client.company}` : ""}
                      </p>
                    </div>
                    {!client.is_active && (
                      <span className="shrink-0 rounded-full bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-600 ring-1 ring-red-200 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20">
                        Disabled
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Footer hint when results are capped */}
          {!is_loading && !fetch_error && total > clients.length && (
            <div className="border-t border-gray-100 px-4 py-2 dark:border-gray-700">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Type to narrow results — showing {clients.length} of {total}
              </p>
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-1.5 text-xs text-error-500 dark:text-error-400">{error}</p>}
    </div>
  );
}
