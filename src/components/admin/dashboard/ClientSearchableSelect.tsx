"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ClientUserOption } from "@/services/admin/link-building-dashboard.service";

interface ClientSearchableSelectProps {
  client_users: ClientUserOption[];
  selected_user_id: number | null | undefined;
  anchor_el: HTMLElement | null;
  onSelect: (value: string) => void;
  onClose: () => void;
}

export default function ClientSearchableSelect({
  client_users,
  selected_user_id,
  anchor_el,
  onSelect,
  onClose,
}: ClientSearchableSelectProps) {
  const dropdown_ref = useRef<HTMLDivElement>(null);
  const search_ref = useRef<HTMLInputElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, min_width: 320 });
  const [search, setSearch] = useState("");
  const [highlighted_idx, setHighlightedIdx] = useState<number>(-1);

  useLayoutEffect(() => {
    if (!anchor_el || !dropdown_ref.current) return;

    const anchor_rect = anchor_el.getBoundingClientRect();
    const dropdown_h = dropdown_ref.current.offsetHeight || 360;
    const dropdown_w = Math.max(dropdown_ref.current.offsetWidth || 320, anchor_rect.width, 320);
    const viewport_w = window.innerWidth;
    const viewport_h = window.innerHeight;

    let left = anchor_rect.left;
    if (left + dropdown_w > viewport_w - 8) {
      left = viewport_w - dropdown_w - 8;
    }
    if (left < 8) left = 8;

    let top = anchor_rect.bottom + 2;
    if (top + dropdown_h > viewport_h - 8) {
      top = anchor_rect.top - dropdown_h - 2;
    }
    if (top < 8) top = 8;

    setPosition({ top, left, min_width: Math.max(anchor_rect.width, 320) });
  }, [anchor_el]);

  useEffect(() => {
    search_ref.current?.focus();
  }, []);

  const filtered_users = search.trim()
    ? client_users.filter(
        (u) =>
          u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase())
      )
    : client_users;

  useEffect(() => {
    setHighlightedIdx(-1);
  }, [search]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdown_ref.current &&
        !dropdown_ref.current.contains(e.target as Node) &&
        anchor_el &&
        !anchor_el.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIdx((prev) => Math.min(prev + 1, filtered_users.length - 1));
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIdx((prev) => Math.max(prev - 1, -1));
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        if (highlighted_idx === -1) {
          onSelect("");
          onClose();
        } else if (filtered_users[highlighted_idx]) {
          onSelect(String(filtered_users[highlighted_idx].id));
          onClose();
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [anchor_el, onClose, onSelect, filtered_users, highlighted_idx]);

  const selected_client = client_users.find(
    (u) => selected_user_id != null && u.id === Number(selected_user_id)
  );

  const content = (
    <div
      ref={dropdown_ref}
      className="fixed z-[9999] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl shadow-gray-400/20 dark:border-gray-700 dark:bg-gray-800 dark:shadow-black/50"
      style={{ top: position.top, left: position.left, minWidth: position.min_width }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-teal-50 px-3 py-2.5 dark:border-gray-700 dark:bg-teal-900/20">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <svg
              className="h-3.5 w-3.5 shrink-0 text-teal-600 dark:text-teal-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-[11px] font-semibold text-teal-700 dark:text-teal-300">
              Assign Client Account
            </p>
          </div>
          {selected_client ? (
            <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-teal-600 dark:text-teal-400">
              <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
              {selected_client.name}
            </p>
          ) : (
            <p className="mt-0.5 text-[10px] text-teal-500/60 dark:text-teal-500/50">
              No client assigned
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="ml-2 shrink-0 rounded-lg p-1 text-teal-500 transition-colors hover:bg-teal-100 hover:text-teal-700 dark:hover:bg-teal-800/50 dark:hover:text-teal-300"
          title="Close"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Search */}
      <div className="border-b border-gray-100 p-2 dark:border-gray-700">
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 dark:text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={search_ref}
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-1.5 pl-8 pr-8 text-xs outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-500 dark:focus:ring-teal-900/40"
          />
          {search && (
            <button
              onClick={() => {
                setSearch("");
                search_ref.current?.focus();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
              title="Clear search"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {search && (
          <p className="mt-1.5 text-[10px] text-gray-400 dark:text-gray-500">
            {filtered_users.length > 0
              ? `${filtered_users.length} result${filtered_users.length !== 1 ? "s" : ""} · ↑↓ to navigate · Enter to select`
              : "No results · try a different term"}
          </p>
        )}
      </div>

      {/* Options list */}
      <div className="max-h-64 overflow-y-auto py-1">
        {/* Unassign option */}
        <button
          onClick={() => {
            onSelect("");
            onClose();
          }}
          className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-xs transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
            highlighted_idx === -1
              ? "bg-gray-50 dark:bg-gray-700/50"
              : ""
          } ${
            selected_user_id == null
              ? "font-semibold text-teal-600 dark:text-teal-400"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dashed border-gray-300 text-[10px] text-gray-400 dark:border-gray-600">
            ∅
          </span>
          <span className="flex-1">— Unassigned —</span>
          {selected_user_id == null && (
            <svg
              className="h-3.5 w-3.5 shrink-0 text-teal-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>

        {filtered_users.length > 0 && (
          <div className="mx-3 my-1 border-t border-gray-100 dark:border-gray-700" />
        )}

        {/* Client options */}
        {filtered_users.map((user, idx) => {
          const is_selected = selected_user_id != null && Number(selected_user_id) === user.id;
          const is_highlighted = idx === highlighted_idx;

          return (
            <button
              key={user.id}
              onClick={() => {
                onSelect(String(user.id));
                onClose();
              }}
              onMouseEnter={() => setHighlightedIdx(idx)}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors ${
                is_highlighted
                  ? "bg-teal-50 dark:bg-teal-900/20"
                  : is_selected
                  ? "bg-teal-50/60 dark:bg-teal-900/10"
                  : "hover:bg-teal-50 dark:hover:bg-teal-900/20"
              } ${
                is_selected
                  ? "font-medium text-teal-700 dark:text-teal-300"
                  : "text-gray-700 dark:text-gray-300"
              }`}
            >
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.name}
                  className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-gray-200 dark:ring-gray-600"
                />
              ) : (
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-[11px] font-bold text-teal-700 dark:bg-teal-900/50 dark:text-teal-300">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium leading-tight">
                  {search.trim()
                    ? highlightMatch(user.name, search)
                    : user.name}
                </p>
                <p className="mt-0.5 truncate text-[10px] leading-tight text-gray-400 dark:text-gray-500">
                  {search.trim()
                    ? highlightMatch(user.email, search)
                    : user.email}
                </p>
              </div>
              {is_selected && (
                <svg
                  className="ml-auto h-4 w-4 shrink-0 text-teal-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          );
        })}

        {/* Empty state */}
        {filtered_users.length === 0 && (
          <div className="flex flex-col items-center px-4 py-8 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
              <svg
                className="h-5 w-5 text-gray-400 dark:text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              No clients found
            </p>
            {search && (
              <>
                <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
                  No results for &ldquo;{search}&rdquo;
                </p>
                <button
                  onClick={() => {
                    setSearch("");
                    search_ref.current?.focus();
                  }}
                  className="mt-2 rounded-lg px-3 py-1 text-[10px] font-medium text-teal-600 transition-colors hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-900/30"
                >
                  Clear search
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2 dark:border-gray-700">
        <p className="text-[10px] text-gray-400 dark:text-gray-500">
          {search.trim()
            ? `${filtered_users.length} of ${client_users.length} client${client_users.length !== 1 ? "s" : ""}`
            : `${client_users.length} client${client_users.length !== 1 ? "s" : ""} total`}
        </p>
        <p className="text-[10px] text-gray-300 dark:text-gray-600">
          <kbd className="rounded bg-gray-100 px-1 py-0.5 font-mono dark:bg-gray-700">Esc</kbd>
          {" "}to close
        </p>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;

  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;

  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-teal-100 px-0.5 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}
