"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface UserFilterOption {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
}

interface UserSelectFilterDropdownProps {
  label: string;
  users: UserFilterOption[];
  selected_user_id: number | null;
  anchor_el: HTMLElement | null;
  onSelect: (user_id: number | null) => void;
  onClose: () => void;
}

export default function UserSelectFilterDropdown({
  label,
  users,
  selected_user_id,
  anchor_el,
  onSelect,
  onClose,
}: UserSelectFilterDropdownProps) {
  const dropdown_ref = useRef<HTMLDivElement>(null);
  const search_ref = useRef<HTMLInputElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [search, setSearch] = useState("");

  useLayoutEffect(() => {
    if (!anchor_el || !dropdown_ref.current) return;

    const anchor_rect  = anchor_el.getBoundingClientRect();
    const dropdown_h   = dropdown_ref.current.offsetHeight;
    const dropdown_w   = dropdown_ref.current.offsetWidth || 256;
    const viewport_w   = window.innerWidth;
    const viewport_h   = window.innerHeight;

    // Horizontal: right-align dropdown to anchor's right edge, clamped inside viewport
    let left = anchor_rect.right - dropdown_w;
    if (left + dropdown_w > viewport_w - 8) {
      left = viewport_w - dropdown_w - 8;
    }
    if (left < 8) left = 8;

    // Vertical: below anchor unless there's not enough room → flip above
    let top = anchor_rect.bottom + 4;
    if (top + dropdown_h > viewport_h - 8) {
      top = anchor_rect.top - dropdown_h - 4;
    }
    if (top < 8) top = 8;

    setPosition({ top, left });
  }, [anchor_el]);

  useEffect(() => {
    search_ref.current?.focus();
  }, []);

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
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [anchor_el, onClose]);

  const filtered_users = search.trim()
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase())
      )
    : users;

  const content = (
    <div
      ref={dropdown_ref}
      className="fixed z-[9999] w-64 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl shadow-gray-200/60 dark:border-gray-700 dark:bg-gray-800 dark:shadow-black/30"
      style={{ top: position.top, left: position.left }}
    >
      {/* Header */}
      <div className="border-b border-gray-100 px-3 py-2.5 dark:border-gray-700">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Filter by {label}
        </p>
        {selected_user_id !== null && (
          <p className="mt-0.5 text-[10px] text-brand-500 dark:text-brand-400">
            {users.find((u) => u.id === selected_user_id)?.name ?? "1 selected"}
          </p>
        )}
      </div>

      {/* Search input */}
      <div className="border-b border-gray-100 p-2 dark:border-gray-700">
        <input
          ref={search_ref}
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-500"
        />
      </div>

      {/* Options list */}
      <div className="max-h-56 overflow-y-auto py-1">
        {/* "All" clear option */}
        <button
          onClick={() => {
            onSelect(null);
            onClose();
          }}
          className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-xs transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
            selected_user_id === null
              ? "font-semibold text-brand-600 dark:text-brand-400"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-dashed border-gray-300 text-[10px] text-gray-400 dark:border-gray-600">
            ∅
          </span>
          <span>All {label}s</span>
          {selected_user_id === null && (
            <svg
              className="ml-auto h-3 w-3 shrink-0 text-brand-500"
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

        {/* User options */}
        {filtered_users.map((user) => (
          <button
            key={user.id}
            onClick={() => {
              onSelect(user.id);
              onClose();
            }}
            className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-xs transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
              selected_user_id === user.id
                ? "bg-brand-50 font-medium text-brand-700 dark:bg-brand-900/20 dark:text-brand-300"
                : "text-gray-700 dark:text-gray-300"
            }`}
          >
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name}
                className="h-5 w-5 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[9px] font-bold text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
                {user.name.charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate">{user.name}</p>
              <p className="truncate text-[10px] text-gray-400 dark:text-gray-500">
                {user.email}
              </p>
            </div>
            {selected_user_id === user.id && (
              <svg
                className="ml-auto h-3 w-3 shrink-0 text-brand-500"
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
        ))}

        {filtered_users.length === 0 && (
          <p className="px-3 py-5 text-center text-xs text-gray-400 dark:text-gray-500">
            No users found
          </p>
        )}
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}
